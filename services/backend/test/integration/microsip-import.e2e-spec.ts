import { randomUUID } from 'crypto';
import { ConflictException, ForbiddenException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { entityPaths, migrationPaths } from '../../src/database/discovery';
import { FoliosService } from '../../src/folios/folios.service';
import { MicrosipImportService } from '../../src/catalog/microsip-import/microsip-import.service';
import { MicrosipCatalogImportDto } from '../../src/catalog/microsip-import/dto/microsip-import.dto';
import { ProductUnit } from '../../src/catalog/products/entities/product.entity';

const integration =
  process.env.IDENTITY_TEST_HOST === 'identity-db' ? describe : describe.skip;

integration('Microsip catalog import (PostgreSQL)', () => {
  let db: DataSource;
  let service: MicrosipImportService;
  const org = randomUUID();
  const otherOrg = randomUUID();
  const supplier = randomUUID();
  const otherSupplier = randomUUID();
  const key = randomUUID();
  const body: MicrosipCatalogImportDto = {
    organizationId: org,
    company: 'pilot',
    products: [
      {
        externalId: 'P1',
        name: 'Tomato',
        unit: ProductUnit.KG,
        supplierId: supplier,
      },
    ],
    priceLists: [{ externalId: 'L1', name: 'Wholesale' }],
    prices: [
      { productExternalId: 'P1', priceListExternalId: 'L1', price: '12.50' },
    ],
    clients: [
      {
        externalId: 'C1',
        name: 'Buyer',
        phoneNumber: '5551234',
        priceListExternalId: 'L1',
      },
    ],
  };

  beforeAll(async () => {
    db = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: entityPaths(),
      migrations: migrationPaths(),
      synchronize: false,
    });
    await db.initialize();
    await db.runMigrations();
    for (const [id, label] of [
      [org, 'a'],
      [otherOrg, 'b'],
    ]) {
      await db.query(
        'INSERT INTO organizations (id, folio, name, product_folio_prefix, price_list_folio_prefix, client_folio_prefix) VALUES ($1, $2, $3, $4, $5, $6)',
        [id, `MICRO-${label}`, label, 'P', 'L', 'C'],
      );
    }
    for (const [id, orgId, label] of [
      [supplier, org, 'a'],
      [otherSupplier, otherOrg, 'b'],
    ]) {
      await db.query(
        'INSERT INTO suppliers (id, organization_id, folio, name) VALUES ($1, $2, $3, $4)',
        [id, orgId, `MICRO-S-${label}`, label],
      );
    }
    service = new MicrosipImportService(db, new FoliosService(db));
  });

  afterAll(async () => {
    if (!db?.isInitialized) return;
    await db.query(
      'DELETE FROM microsip_catalog_import_receipts WHERE organization_id IN ($1, $2)',
      [org, otherOrg],
    );
    await db.query('DELETE FROM clients WHERE organization_id IN ($1, $2)', [
      org,
      otherOrg,
    ]);
    await db.query(
      'DELETE FROM product_prices WHERE organization_id IN ($1, $2)',
      [org, otherOrg],
    );
    await db.query('DELETE FROM products WHERE organization_id IN ($1, $2)', [
      org,
      otherOrg,
    ]);
    await db.query(
      'DELETE FROM price_lists WHERE organization_id IN ($1, $2)',
      [org, otherOrg],
    );
    await db.query('DELETE FROM suppliers WHERE organization_id IN ($1, $2)', [
      org,
      otherOrg,
    ]);
    await db.query('DELETE FROM organizations WHERE id IN ($1, $2)', [
      org,
      otherOrg,
    ]);
    await db.destroy();
  });

  it('previews without writing and applies an atomic import with replay', async () => {
    const preview = await service.run('preview', body, org);
    expect(preview).toMatchObject({
      mode: 'preview',
      appliedAt: null,
      products: { created: 1 },
      prices: { created: 1 },
      clients: { created: 1 },
    });
    expect(
      await db.query('SELECT id FROM products WHERE organization_id = $1', [
        org,
      ]),
    ).toHaveLength(0);
    const applied = await service.run('apply', body, org, key);
    expect(applied).toMatchObject({
      mode: 'apply',
      products: { created: 1 },
      priceLists: { created: 1 },
      prices: { created: 1 },
      clients: { created: 1 },
    });
    expect(await service.run('apply', body, org, key)).toEqual(applied);
    await expect(
      service.run('apply', { ...body, company: 'different' }, org, key),
    ).rejects.toBeInstanceOf(ConflictException);
    const repeat = await service.run('apply', body, org, randomUUID());
    expect(repeat.products.unchanged).toBe(1);
    expect(repeat.priceLists.unchanged).toBe(1);
    expect(repeat.prices.unchanged).toBe(1);
    expect(repeat.clients.unchanged).toBe(1);
  });

  it('rejects cross-organization scope and supplier, rolling back every row', async () => {
    await expect(service.run('preview', body, otherOrg)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    const changed = {
      ...body,
      products: [{ ...body.products[0], externalId: 'P2' }],
      priceLists: [{ externalId: 'L2', name: 'Wholesale' }],
      prices: [],
      clients: [],
    };
    await expect(
      service.run('apply', changed, org, randomUUID()),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(
      await db.query(
        'SELECT id FROM products WHERE organization_id = $1 AND microsip_external_id = $2',
        [org, 'P2'],
      ),
    ).toHaveLength(0);
    await expect(
      service.run(
        'apply',
        {
          ...body,
          products: [{ ...body.products[0], supplierId: otherSupplier }],
        },
        org,
        randomUUID(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
