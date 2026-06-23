import { BadRequestException, NotFoundException } from '@nestjs/common';
import { FindOperator, Repository } from 'typeorm';
import { Product } from '../src/catalog/products/entities/product.entity';
import {
  InventoryMovement,
  InventoryMovementType,
} from '../src/inventory/entities/inventory-movement.entity';
import { PurchaseItem } from '../src/purchase/entities/purchase-item.entity';
import { Purchase } from '../src/purchase/entities/purchase.entity';
import { PurchaseService } from '../src/purchase/purchase.service';
import { Supplier } from '../src/suppliers/entities/supplier.entity';
import { User } from '../src/users/entities/user.entity';

type DataStore = {
  purchases: Purchase[];
  purchaseItems: PurchaseItem[];
  products: Product[];
  suppliers: Supplier[];
  users: User[];
  movements: InventoryMovement[];
};

const orgId = '00000000-0000-4000-8000-000000000001';
const otherOrgId = '00000000-0000-4000-8000-000000000002';
const userId = '00000000-0000-4000-8000-000000000101';
const supplierId = '00000000-0000-4000-8000-000000000201';
const supplier2Id = '00000000-0000-4000-8000-000000000202';
const productAId = '00000000-0000-4000-8000-000000000301';
const productBId = '00000000-0000-4000-8000-000000000302';
const purchaseId = '00000000-0000-4000-8000-000000000401';

function inValues(value: unknown): unknown[] {
  if (value instanceof FindOperator) {
    return value.value as unknown[];
  }
  return Array.isArray(value) ? value : [value];
}

function product(id: string, stock: number, organizationId = orgId): Product {
  return {
    id,
    organization_id: organizationId,
    name: `Product ${id}`,
    stock,
  } as Product;
}

function supplier(id = supplierId, organizationId = orgId): Supplier {
  return {
    id,
    organization_id: organizationId,
    name: `Supplier ${id}`,
  } as Supplier;
}

function user(id = userId, organizationId = orgId): User {
  return {
    id,
    organization_id: organizationId,
  } as User;
}

function purchase(
  items: PurchaseItem[],
  organizationId = orgId,
  supplierRef = supplier(),
): Purchase {
  return {
    id: purchaseId,
    organization_id: organizationId,
    supplier_id: supplierRef.id,
    supplier: supplierRef,
    user_id: userId,
    user: user(),
    folio: 'C-0001',
    purchase_date: new Date('2026-06-01T00:00:00.000Z'),
    notes: 'Original',
    items,
  } as Purchase;
}

function purchaseItem(productRef: Product, quantity: number): PurchaseItem {
  return {
    id: `item-${productRef.id}`,
    purchase_id: purchaseId,
    product_id: productRef.id,
    product: productRef,
    quantity,
    unit_cost: 10,
    subtotal: quantity * 10,
  } as PurchaseItem;
}

function createHarness(store: DataStore) {
  const repositories = new Map<unknown, unknown>();

  const purchaseRepository = {
    manager: {
      transaction: jest.fn((callback: (manager: unknown) => unknown) =>
        Promise.resolve(callback(manager)),
      ),
    },
    find: jest.fn(),
    findOne: jest.fn(({ where }: { where: Partial<Purchase> }) => {
      const item = store.purchases.find(
        (current) =>
          current.id === where.id &&
          current.organization_id === where.organization_id,
      );
      return Promise.resolve(item ?? null);
    }),
    create: jest.fn((input: Partial<Purchase>) => input as Purchase),
    merge: jest.fn((target: Purchase, input: Partial<Purchase>) =>
      Object.assign(target, input),
    ),
    save: jest.fn((entity: Purchase) => {
      const index = store.purchases.findIndex((item) => item.id === entity.id);
      if (index === -1) {
        store.purchases.push(entity);
      }
      return Promise.resolve(entity);
    }),
    remove: jest.fn((entity: Purchase) => {
      store.purchases = store.purchases.filter((item) => item.id !== entity.id);
      store.purchaseItems = store.purchaseItems.filter(
        (item) => item.purchase_id !== entity.id,
      );
      return Promise.resolve(entity);
    }),
  };

  const purchaseItemsRepository = {
    create: jest.fn((input: Partial<PurchaseItem>) => input as PurchaseItem),
    save: jest.fn((entities: PurchaseItem[]) => {
      store.purchaseItems.push(...entities);
      return Promise.resolve(entities);
    }),
    delete: jest.fn(({ purchase_id }: { purchase_id: string }) => {
      store.purchaseItems = store.purchaseItems.filter(
        (item) => item.purchase_id !== purchase_id,
      );
      const currentPurchase = store.purchases.find(
        (item) => item.id === purchase_id,
      );
      if (currentPurchase) {
        currentPurchase.items = [];
      }
      return Promise.resolve({ affected: 1 });
    }),
  };

  const productsRepository = {
    findBy: jest.fn(
      ({
        id,
        organization_id,
      }: {
        id: FindOperator<string>;
        organization_id: string;
      }) => {
        const ids = inValues(id);
        return store.products.filter(
          (item) =>
            ids.includes(item.id) && item.organization_id === organization_id,
        );
      },
    ),
    save: jest.fn((entity: Product) => Promise.resolve(entity)),
  };

  const suppliersRepository = {
    findOneBy: jest.fn((where: Partial<Supplier>) => {
      return Promise.resolve(
        store.suppliers.find(
          (item) =>
            item.id === where.id &&
            item.organization_id === where.organization_id,
        ) ?? null,
      );
    }),
  };

  const usersRepository = {
    findOneBy: jest.fn((where: Partial<User>) => {
      return Promise.resolve(
        store.users.find(
          (item) =>
            item.id === where.id &&
            item.organization_id === where.organization_id,
        ) ?? null,
      );
    }),
  };

  const movementsRepository = {
    create: jest.fn(
      (input: Partial<InventoryMovement>) => input as InventoryMovement,
    ),
    save: jest.fn((entity: InventoryMovement) => {
      store.movements.push(entity);
      return Promise.resolve(entity);
    }),
  };

  const manager = {
    getRepository: jest.fn((entity: unknown) => repositories.get(entity)),
  };

  repositories.set(Purchase, purchaseRepository);
  repositories.set(PurchaseItem, purchaseItemsRepository);
  repositories.set(Product, productsRepository);
  repositories.set(Supplier, suppliersRepository);
  repositories.set(User, usersRepository);
  repositories.set(InventoryMovement, movementsRepository);

  const service = new PurchaseService(
    purchaseRepository as unknown as Repository<Purchase>,
    suppliersRepository as unknown as Repository<Supplier>,
    productsRepository as unknown as Repository<Product>,
    usersRepository as unknown as Repository<User>,
    { generateFolio: jest.fn() } as never,
  );

  return {
    service,
    repositories: {
      purchaseRepository,
      purchaseItemsRepository,
      productsRepository,
      movementsRepository,
    },
    manager,
  };
}

function createStore(initialProducts: Product[]): DataStore {
  const supplierRef = supplier();
  const item = purchaseItem(initialProducts[0], 5);
  const purchaseRef = purchase([item], orgId, supplierRef);

  return {
    products: initialProducts,
    suppliers: [supplierRef, supplier(supplier2Id)],
    users: [user()],
    purchases: [purchaseRef],
    purchaseItems: [item],
    movements: [],
  };
}

describe('PurchaseService', () => {
  it('updates metadata without changing stock', async () => {
    const productRef = product(productAId, 15);
    const store = createStore([productRef]);
    const { service, repositories } = createHarness(store);

    await expect(
      service.update(
        purchaseId,
        {
          notes: 'Updated',
          purchase_date: '2026-06-02T00:00:00.000Z',
        },
        orgId,
        userId,
      ),
    ).resolves.toMatchObject({ id: purchaseId, notes: 'Updated' });

    expect(productRef.stock).toBe(15);
    expect(store.movements).toHaveLength(0);
    expect(repositories.purchaseItemsRepository.delete).not.toHaveBeenCalled();
  });

  it('updates quantity by reversing old stock and applying new stock', async () => {
    const productRef = product(productAId, 15);
    const store = createStore([productRef]);
    const { service } = createHarness(store);

    await service.update(
      purchaseId,
      {
        items: [{ product_id: productAId, quantity: 8, unit_cost: 11 }],
      },
      orgId,
      userId,
    );

    expect(productRef.stock).toBe(18);
    expect(store.movements).toEqual([
      expect.objectContaining({
        movement_type: InventoryMovementType.OUT,
        product_id: productAId,
        quantity: 5,
        previous_stock: 15,
        new_stock: 10,
      }),
      expect.objectContaining({
        movement_type: InventoryMovementType.IN,
        product_id: productAId,
        quantity: 8,
        previous_stock: 10,
        new_stock: 18,
      }),
    ]);
  });

  it('replaces product lines by reversing removed products and applying new products', async () => {
    const productA = product(productAId, 15);
    const productB = product(productBId, 2);
    const store = createStore([productA, productB]);
    const { service } = createHarness(store);

    await service.update(
      purchaseId,
      {
        items: [{ product_id: productBId, quantity: 4, unit_cost: 7 }],
      },
      orgId,
      userId,
    );

    expect(productA.stock).toBe(10);
    expect(productB.stock).toBe(6);
    expect(store.purchaseItems).toEqual([
      expect.objectContaining({
        purchase_id: purchaseId,
        product_id: productBId,
        quantity: 4,
      }),
    ]);
  });

  it('deletes a purchase and reverses stock', async () => {
    const productRef = product(productAId, 15);
    const store = createStore([productRef]);
    const { service } = createHarness(store);

    await expect(service.remove(purchaseId, orgId, userId)).resolves.toEqual({
      id: purchaseId,
      deleted: true,
    });

    expect(productRef.stock).toBe(10);
    expect(store.purchases).toHaveLength(0);
    expect(store.purchaseItems).toHaveLength(0);
    expect(store.movements).toEqual([
      expect.objectContaining({
        movement_type: InventoryMovementType.OUT,
        product_id: productAId,
        quantity: 5,
        reason: 'Compra eliminada: C-0001',
      }),
    ]);
  });

  it('rejects update when reversing stock would make inventory negative', async () => {
    const productRef = product(productAId, 3);
    const store = createStore([productRef]);
    const { service } = createHarness(store);

    await expect(
      service.update(
        purchaseId,
        {
          items: [{ product_id: productAId, quantity: 8, unit_cost: 11 }],
        },
        orgId,
        userId,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRef.stock).toBe(3);
    expect(store.movements).toHaveLength(0);
  });

  it('rejects delete when reversing stock would make inventory negative', async () => {
    const productRef = product(productAId, 3);
    const store = createStore([productRef]);
    const { service } = createHarness(store);

    await expect(
      service.remove(purchaseId, orgId, userId),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(productRef.stock).toBe(3);
    expect(store.purchases).toHaveLength(1);
    expect(store.movements).toHaveLength(0);
  });

  it('does not update purchases from another organization', async () => {
    const productRef = product(productAId, 15, otherOrgId);
    const store = createStore([productRef]);
    store.purchases[0].organization_id = otherOrgId;
    const { service } = createHarness(store);

    await expect(
      service.update(purchaseId, { notes: 'Nope' }, orgId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('does not delete purchases from another organization', async () => {
    const productRef = product(productAId, 15, otherOrgId);
    const store = createStore([productRef]);
    store.purchases[0].organization_id = otherOrgId;
    const { service } = createHarness(store);

    await expect(
      service.remove(purchaseId, orgId, userId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
