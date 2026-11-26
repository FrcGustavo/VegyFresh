import { createHash, randomUUID } from 'crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Product } from '../products/entities/product.entity';
import { PriceList } from '../price-lists/entities/price-list.entity';
import { ProductPrice } from '../product-prices/entities/product-price.entity';
import { Client } from '../../clients/entities/client.entity';
import { Supplier } from '../../suppliers/entities/supplier.entity';
import { Organization } from '../../organizations/entities/organization.entity';
import { FoliosService } from '../../folios/folios.service';
import {
  MicrosipCatalogImportDto,
  MicrosipCatalogImportResultDto,
} from './dto/microsip-import.dto';
import { MicrosipImportReceipt } from './microsip-import-receipt.entity';

type Counts = { created: number; updated: number; unchanged: number };
const counts = (): Counts => ({ created: 0, updated: 0, unchanged: 0 });

@Injectable()
export class MicrosipImportService {
  constructor(
    private readonly db: DataSource,
    private readonly folios: FoliosService,
  ) {}

  async run(
    mode: 'preview' | 'apply',
    body: MicrosipCatalogImportDto,
    orgId: string,
    key?: string,
  ): Promise<MicrosipCatalogImportResultDto> {
    if (body.organizationId !== orgId)
      throw new ForbiddenException('Organization scope mismatch');
    const unique = (values: string[], label: string) => {
      if (new Set(values).size !== values.length)
        throw new BadRequestException(`Duplicate ${label}`);
    };
    unique(
      body.products.map((x) => x.externalId),
      'product externalId',
    );
    unique(
      body.priceLists.map((x) => x.externalId),
      'price list externalId',
    );
    unique(
      body.clients.map((x) => x.externalId),
      'client externalId',
    );
    unique(
      body.prices.map(
        (x) => `${x.productExternalId}\0${x.priceListExternalId}`,
      ),
      'price pair',
    );
    unique(
      body.products.flatMap((x) => (x.vegyfreshId ? [x.vegyfreshId] : [])),
      'product vegyfreshId',
    );
    unique(
      body.priceLists.flatMap((x) => (x.vegyfreshId ? [x.vegyfreshId] : [])),
      'price list vegyfreshId',
    );
    unique(
      body.clients.flatMap((x) => (x.vegyfreshId ? [x.vegyfreshId] : [])),
      'client vegyfreshId',
    );
    const productKeys = new Set(body.products.map((x) => x.externalId));
    const listKeys = new Set(body.priceLists.map((x) => x.externalId));
    for (const x of body.prices)
      if (
        !productKeys.has(x.productExternalId) ||
        !listKeys.has(x.priceListExternalId)
      )
        throw new BadRequestException('Price references missing import row');
    for (const x of body.clients)
      if (!listKeys.has(x.priceListExternalId))
        throw new BadRequestException('Client references missing price list');

    const runner = this.db.createQueryRunner();
    try {
      await runner.connect();
      await runner.startTransaction();
      // The organization lock serializes imports and folio allocation across workers.
      await runner.query('SELECT pg_advisory_xact_lock(hashtext($1))', [orgId]);
      const hash = createHash('sha256')
        .update(JSON.stringify(body))
        .digest('hex');
      if (mode === 'apply') {
        const receipt = await runner.manager
          .getRepository(MicrosipImportReceipt)
          .findOneBy({ organization_id: orgId, idempotency_key: key! });
        if (receipt) {
          if (receipt.request_hash !== hash)
            throw new ConflictException(
              'Idempotency-Key already used for a different payload',
            );
          await runner.rollbackTransaction();
          return receipt.result;
        }
      }
      let result: MicrosipCatalogImportResultDto;
      try {
        result = await this.process(runner.manager, body, mode);
      } catch (error: unknown) {
        if (
          error instanceof ConflictException ||
          (typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            error.code === '23505')
        ) {
          throw new ConflictException({
            code: 'MICROSIP_IMPORT_CONFLICT',
            message:
              error instanceof ConflictException
                ? error.message
                : 'Catalog identity or name conflicts',
          });
        }
        throw error;
      }
      if (mode === 'apply') {
        await runner.manager.getRepository(MicrosipImportReceipt).insert({
          organization_id: orgId,
          idempotency_key: key!,
          request_hash: hash,
          result,
        });
        await runner.commitTransaction();
      } else await runner.rollbackTransaction();
      return result;
    } catch (error) {
      if (runner.isTransactionActive) await runner.rollbackTransaction();
      throw error;
    } finally {
      await runner.release();
    }
  }

  private async process(
    manager: EntityManager,
    body: MicrosipCatalogImportDto,
    mode: 'preview' | 'apply',
  ): Promise<MicrosipCatalogImportResultDto> {
    const org = await manager
      .getRepository(Organization)
      .findOneBy({ id: body.organizationId });
    if (!org) throw new BadRequestException('Organization does not exist');
    const result: MicrosipCatalogImportResultDto = {
      mode,
      appliedAt: mode === 'apply' ? new Date().toISOString() : null,
      products: counts(),
      priceLists: counts(),
      prices: counts(),
      clients: counts(),
    };
    const products = await manager
      .getRepository(Product)
      .createQueryBuilder('x')
      .addSelect(['x.microsip_company', 'x.microsip_external_id'])
      .where('x.organization_id = :org', { org: org.id })
      .getMany();
    const lists = await manager
      .getRepository(PriceList)
      .createQueryBuilder('x')
      .addSelect(['x.microsip_company', 'x.microsip_external_id'])
      .where('x.organization_id = :org', { org: org.id })
      .getMany();
    const clients = await manager
      .getRepository(Client)
      .createQueryBuilder('x')
      .addSelect(['x.microsip_company', 'x.microsip_external_id'])
      .where('x.organization_id = :org', { org: org.id })
      .getMany();
    const suppliers = new Set(
      (
        await manager
          .getRepository(Supplier)
          .find({ where: { organization_id: org.id }, select: ['id'] })
      ).map((x) => x.id),
    );
    let allocateProduct: (() => string) | undefined;
    let allocateList: (() => string) | undefined;
    let allocateClient: (() => string) | undefined;
    const resolve = <
      T extends {
        id: string;
        microsip_company: string | null;
        microsip_external_id: string | null;
      },
    >(
      rows: T[],
      externalId: string,
      vegyfreshId: string | undefined,
      label: string,
    ): T | undefined => {
      const linked = rows.find(
        (x) =>
          x.microsip_company === body.company &&
          x.microsip_external_id === externalId,
      );
      const explicit = vegyfreshId
        ? rows.find((x) => x.id === vegyfreshId)
        : undefined;
      if (vegyfreshId && !explicit)
        throw new ConflictException(
          `${label} binding is outside organization or missing`,
        );
      if (linked && explicit && linked.id !== explicit.id)
        throw new ConflictException(
          `${label} binding conflicts with external ID`,
        );
      const row = linked ?? explicit;
      if (
        row?.microsip_company &&
        (row.microsip_company !== body.company ||
          row.microsip_external_id !== externalId)
      )
        throw new ConflictException(`${label} already bound`);
      return row;
    };
    const productMap = new Map<string, Product>();
    for (const input of body.products) {
      let dirty = false;
      if (!suppliers.has(input.supplierId))
        throw new ConflictException(
          'Supplier is outside organization or missing',
        );
      let row = resolve(
        products,
        input.externalId,
        input.vegyfreshId,
        'Product',
      );
      const isNew = !row;
      if (row && row.unit !== input.unit)
        throw new ConflictException('Product unit mismatch');
      if (!row) {
        allocateProduct ??= await this.folios.prepareCatalogFolioAllocator(
          'products',
          org,
          manager,
        );
        row = manager.getRepository(Product).create({
          id: randomUUID(),
          organization_id: org.id,
          folio: allocateProduct(),
          name: input.name,
          unit: input.unit,
          supplier_id: input.supplierId,
          microsip_company: body.company,
          microsip_external_id: input.externalId,
        });
        result.products.created++;
        dirty = true;
        products.push(row);
      } else {
        const changed =
          row.name !== input.name ||
          row.supplier_id !== input.supplierId ||
          row.microsip_company !== body.company ||
          row.microsip_external_id !== input.externalId;
        result.products[changed ? 'updated' : 'unchanged']++;
        dirty = changed;
        Object.assign(row, {
          name: input.name,
          supplier_id: input.supplierId,
          microsip_company: body.company,
          microsip_external_id: input.externalId,
        });
      }
      if (mode === 'apply' && dirty) {
        if (isNew) await manager.getRepository(Product).save(row);
        else
          await manager.getRepository(Product).update(
            { id: row.id, organization_id: org.id },
            {
              name: input.name,
              supplier_id: input.supplierId,
              microsip_company: body.company,
              microsip_external_id: input.externalId,
            },
          );
      }
      productMap.set(input.externalId, row);
    }
    const listMap = new Map<string, PriceList>();
    for (const input of body.priceLists) {
      let dirty = false;
      let row = resolve(
        lists,
        input.externalId,
        input.vegyfreshId,
        'Price list',
      );
      const isNew = !row;
      if (lists.some((x) => x.name === input.name && x.id !== row?.id))
        throw new ConflictException('Price list name conflicts');
      if (!row) {
        allocateList ??= await this.folios.prepareCatalogFolioAllocator(
          'price_lists',
          org,
          manager,
        );
        row = manager.getRepository(PriceList).create({
          id: randomUUID(),
          organization_id: org.id,
          folio: allocateList(),
          name: input.name,
          microsip_company: body.company,
          microsip_external_id: input.externalId,
        });
        result.priceLists.created++;
        dirty = true;
        lists.push(row);
      } else {
        const changed =
          row.name !== input.name ||
          row.microsip_company !== body.company ||
          row.microsip_external_id !== input.externalId;
        result.priceLists[changed ? 'updated' : 'unchanged']++;
        dirty = changed;
        Object.assign(row, {
          name: input.name,
          microsip_company: body.company,
          microsip_external_id: input.externalId,
        });
      }
      if (mode === 'apply' && dirty) {
        if (isNew) await manager.getRepository(PriceList).save(row);
        else
          await manager.getRepository(PriceList).update(
            { id: row.id, organization_id: org.id },
            {
              name: input.name,
              microsip_company: body.company,
              microsip_external_id: input.externalId,
            },
          );
      }
      listMap.set(input.externalId, row);
    }
    const existingPrices = await manager
      .getRepository(ProductPrice)
      .find({ where: { organization_id: org.id } });
    for (const input of body.prices) {
      let dirty = false;
      const product = productMap.get(input.productExternalId)!;
      const list = listMap.get(input.priceListExternalId)!;
      let row = existingPrices.find(
        (x) => x.product_id === product.id && x.price_list_id === list.id,
      );
      const isNew = !row;
      if (!row) {
        row = manager.getRepository(ProductPrice).create({
          id: randomUUID(),
          organization_id: org.id,
          product_id: product.id,
          price_list_id: list.id,
          price: Number(input.price),
        });
        result.prices.created++;
        dirty = true;
        existingPrices.push(row);
      } else {
        const changed = Number(row.price) !== Number(input.price);
        result.prices[changed ? 'updated' : 'unchanged']++;
        dirty = changed;
        row.price = Number(input.price);
      }
      if (mode === 'apply' && dirty) {
        if (isNew) await manager.getRepository(ProductPrice).save(row);
        else
          await manager
            .getRepository(ProductPrice)
            .update(
              { id: row.id, organization_id: org.id },
              { price: Number(input.price) },
            );
      }
    }
    for (const input of body.clients) {
      let dirty = false;
      let row = resolve(clients, input.externalId, input.vegyfreshId, 'Client');
      const isNew = !row;
      const listId = listMap.get(input.priceListExternalId)!.id;
      if (!row) {
        allocateClient ??= await this.folios.prepareCatalogFolioAllocator(
          'clients',
          org,
          manager,
        );
        row = manager.getRepository(Client).create({
          id: randomUUID(),
          organization_id: org.id,
          folio: allocateClient(),
          name: input.name,
          phone_number: input.phoneNumber,
          email: input.email ?? null,
          price_list_id: listId,
          microsip_company: body.company,
          microsip_external_id: input.externalId,
        });
        result.clients.created++;
        dirty = true;
        clients.push(row);
      } else {
        const changed =
          row.name !== input.name ||
          row.phone_number !== input.phoneNumber ||
          row.price_list_id !== listId ||
          (input.email !== undefined && row.email !== input.email) ||
          row.microsip_company !== body.company ||
          row.microsip_external_id !== input.externalId;
        result.clients[changed ? 'updated' : 'unchanged']++;
        dirty = changed;
        Object.assign(row, {
          name: input.name,
          phone_number: input.phoneNumber,
          price_list_id: listId,
          microsip_company: body.company,
          microsip_external_id: input.externalId,
        });
        if (input.email !== undefined) row.email = input.email;
      }
      if (mode === 'apply' && dirty) {
        if (isNew) await manager.getRepository(Client).save(row);
        else
          await manager.getRepository(Client).update(
            { id: row.id, organization_id: org.id },
            {
              name: input.name,
              phone_number: input.phoneNumber,
              price_list_id: listId,
              ...(input.email !== undefined ? { email: input.email } : {}),
              microsip_company: body.company,
              microsip_external_id: input.externalId,
            },
          );
      }
    }
    return result;
  }
}
