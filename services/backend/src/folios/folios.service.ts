import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { Organization } from '../organizations/entities/organization.entity';

export type FolioResource =
  | 'products'
  | 'price_lists'
  | 'orders'
  | 'clients'
  | 'suppliers'
  | 'inventory_entries'
  | 'users'
  | 'organizations';

@Injectable()
export class FoliosService {
  constructor(private readonly dataSource: DataSource) {}

  private resolvePrefix(resource: FolioResource, organization?: Organization) {
    if (resource === 'organizations' && !organization) {
      return 'ORG';
    }

    if ((resource !== 'organizations' && !organization) || !organization) {
      throw new NotFoundException(
        `Organization is required to generate folio for resource ${resource}`,
      );
    }

    const prefixMap: { [key in FolioResource]?: string | null } = {
      products: organization.product_folio_prefix,
      price_lists: organization.price_list_folio_prefix,
      orders: organization.order_folio_prefix,
      clients: organization.client_folio_prefix,
      suppliers: organization.supplier_folio_prefix,
      inventory_entries: organization.purchase_folio_prefix,
      users: organization.user_folio_prefix,
    };

    const prefix: string | null | undefined = prefixMap[resource];

    if (typeof prefix !== 'string') {
      throw new NotFoundException(
        `Invalid resource type ${resource} for folio generation`,
      );
    }

    return prefix;
  }

  private getCount(resource: string, organization: Organization) {
    return this.dataSource
      .getRepository(resource)
      .count({ where: { organization_id: organization.id } });
  }

  private async countExistingFolios(
    resource: FolioResource,
    organization: Organization,
  ) {
    switch (resource) {
      case 'orders':
        return this.getCount('Order', organization);
      case 'suppliers':
        return this.getCount('Supplier', organization);
      case 'inventory_entries':
        return this.getCount('Purchase', organization);
      case 'users':
        return this.getCount('User', organization);
      default:
        throw new NotFoundException(
          `Folio counting not implemented for resource ${resource}`,
        );
    }
  }

  private buildFolio(prefix: string, folioNumber: string) {
    let zeros = '';

    if (folioNumber.length === 1) {
      zeros = '000';
    } else if (folioNumber.length === 2) {
      zeros = '00';
    } else if (folioNumber.length === 3) {
      zeros = '0';
    }

    const folio = `${prefix}${zeros}${folioNumber}`;

    return folio;
  }

  async prepareCatalogFolioAllocator(
    resource: 'products' | 'price_lists' | 'clients',
    organization: Organization,
    manager: EntityManager = this.dataSource.manager,
  ) {
    const entity = {
      products: 'Product',
      price_lists: 'PriceList',
      clients: 'Client',
    }[resource];
    const prefix = this.resolvePrefix(resource, organization);
    const records = (await manager.getRepository(entity).find({
      where: { organization_id: organization.id },
      select: ['folio'],
    })) as { folio: string }[];
    const used = new Set(records.map(({ folio }) => folio));
    let sequence = records.length + 1;

    return () => {
      let folio: string;
      do {
        folio = this.buildFolio(prefix, String(sequence++));
      } while (used.has(folio));
      return folio;
    };
  }

  async generateFolio(resource: FolioResource, organizationId?: string) {
    if (resource === 'organizations') {
      const prefix = this.resolvePrefix(resource);
      const countOrganizations = await this.dataSource
        .getRepository(Organization)
        .count();
      const nextFolioNumber = String(countOrganizations + 1);

      return this.buildFolio(prefix, nextFolioNumber);
    }

    if (!organizationId) {
      throw new NotFoundException(
        `Organization ID is required to generate folio for resource ${resource}`,
      );
    }

    const organization: Organization | null = await this.dataSource
      .getRepository(Organization)
      .findOne({
        where: { id: organizationId },
      });

    if (!organization) {
      throw new NotFoundException(
        `Organization with ID ${organizationId} not found for folio generation`,
      );
    }

    const prefix = this.resolvePrefix(resource, organization);
    if (
      resource === 'products' ||
      resource === 'price_lists' ||
      resource === 'clients'
    ) {
      const allocate = await this.prepareCatalogFolioAllocator(
        resource,
        organization,
      );
      return allocate();
    }
    const count = await this.countExistingFolios(resource, organization);
    const nextFolioNumber = String(count + 1);

    return this.buildFolio(prefix, nextFolioNumber);
  }
}
