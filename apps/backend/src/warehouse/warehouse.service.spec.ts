import { BadRequestException, NotFoundException } from '@nestjs/common';
import { WarehouseService } from './warehouse.service';

describe('WarehouseService', () => {
  const createService = () => {
    const managerPurchaseRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'purchase-1' })),
      findOne: jest.fn(),
    };
    const managerPurchaseItemRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    };
    const managerSupplierRepository = {
      findOneBy: jest.fn(),
    };
    const managerProductRepository = {
      findBy: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(async (value) => value),
    };
    const managerUserRepository = {
      findOneBy: jest.fn(),
    };
    const managerMovementRepository = {
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => ({ ...value, id: 'movement-1' })),
    };

    const manager = {
      query: jest.fn().mockResolvedValue([{ folio: 1 }]),
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity?.name === 'Purchase') return managerPurchaseRepository;
        if (entity?.name === 'PurchaseItem') return managerPurchaseItemRepository;
        if (entity?.name === 'Supplier') return managerSupplierRepository;
        if (entity?.name === 'Product') return managerProductRepository;
        if (entity?.name === 'User') return managerUserRepository;
        if (entity?.name === 'InventoryMovement') return managerMovementRepository;
        return undefined;
      }),
    };

    const purchasesRepository = {
      manager: {
        transaction: jest.fn((cb: (manager: typeof manager) => unknown) =>
          cb(manager),
        ),
      },
      findOne: jest.fn(),
      find: jest.fn(),
    };
    const purchaseItemsRepository = {
      save: jest.fn(),
    };
    const inventoryMovementsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    const suppliersRepository = {
      findOneBy: jest.fn(),
    };
    const productsRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      findBy: jest.fn(),
      save: jest.fn(),
    };
    const usersRepository = {
      findOneBy: jest.fn(),
    };

    const service = new WarehouseService(
      purchasesRepository as never,
      purchaseItemsRepository as never,
      inventoryMovementsRepository as never,
      suppliersRepository as never,
      productsRepository as never,
      usersRepository as never,
    );

    return {
      service,
      manager,
      managerPurchaseRepository,
      managerPurchaseItemRepository,
      managerSupplierRepository,
      managerProductRepository,
      managerUserRepository,
      managerMovementRepository,
      purchasesRepository,
      inventoryMovementsRepository,
    };
  };

  it('creates a purchase and increases stock with inventory movements', async () => {
    const context = createService();
    context.managerSupplierRepository.findOneBy.mockResolvedValue({
      id: 'supplier-1',
      organization_id: 'org-1',
    });
    context.managerUserRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.managerProductRepository.findBy.mockResolvedValue([
      { id: 'product-1', organization_id: 'org-1', stock: 2.5 },
    ]);
    context.purchasesRepository.findOne.mockResolvedValue({
      id: 'purchase-1',
      organization_id: 'org-1',
      items: [],
    });

    await context.service.createPurchase(
      {
        supplier_id: 'supplier-1',
        purchase_date: '2026-05-25T00:00:00.000Z',
        items: [{ product_id: 'product-1', quantity: 1.25, unit_cost: 10 }],
      },
      'org-1',
      'user-1',
    );

    expect(context.managerProductRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1', stock: 3.75 }),
    );
    expect(context.managerMovementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'IN',
        quantity: 1.25,
        previous_stock: 2.5,
        new_stock: 3.75,
      }),
    );
  });

  it('stores purchase items and total amount from item subtotals', async () => {
    const context = createService();
    context.managerSupplierRepository.findOneBy.mockResolvedValue({
      id: 'supplier-1',
      organization_id: 'org-1',
    });
    context.managerUserRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.managerProductRepository.findBy.mockResolvedValue([
      { id: 'product-1', organization_id: 'org-1', stock: 0 },
      { id: 'product-2', organization_id: 'org-1', stock: 0 },
    ]);
    context.purchasesRepository.findOne.mockResolvedValue({
      id: 'purchase-1',
      organization_id: 'org-1',
      items: [],
    });

    await context.service.createPurchase(
      {
        supplier_id: 'supplier-1',
        items: [
          { product_id: 'product-1', quantity: 2, unit_cost: 12.5 },
          { product_id: 'product-2', quantity: 3, unit_cost: 10 },
        ],
      },
      'org-1',
      'user-1',
    );

    expect(context.managerPurchaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        total_amount: 55,
      }),
    );
    expect(context.managerPurchaseItemRepository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ subtotal: 25 }),
        expect.objectContaining({ subtotal: 30 }),
      ]),
    );
  });

  it('rejects purchases with supplier from another organization', async () => {
    const context = createService();
    context.managerSupplierRepository.findOneBy.mockResolvedValue(null);

    await expect(
      context.service.createPurchase(
        {
          supplier_id: 'supplier-x',
          items: [{ product_id: 'product-1', quantity: 1, unit_cost: 10 }],
        },
        'org-1',
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects purchases with products from another organization', async () => {
    const context = createService();
    context.managerSupplierRepository.findOneBy.mockResolvedValue({
      id: 'supplier-1',
      organization_id: 'org-1',
    });
    context.managerUserRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.managerProductRepository.findBy.mockResolvedValue([]);

    await expect(
      context.service.createPurchase(
        {
          supplier_id: 'supplier-1',
          items: [{ product_id: 'product-x', quantity: 1, unit_cost: 10 }],
        },
        'org-1',
        'user-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('supports decimal quantities for kg products', async () => {
    const context = createService();
    context.managerSupplierRepository.findOneBy.mockResolvedValue({
      id: 'supplier-1',
      organization_id: 'org-1',
    });
    context.managerUserRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.managerProductRepository.findBy.mockResolvedValue([
      { id: 'product-kg', organization_id: 'org-1', stock: 0.125, unit: 'kg' },
    ]);
    context.purchasesRepository.findOne.mockResolvedValue({
      id: 'purchase-1',
      organization_id: 'org-1',
      items: [],
    });

    await context.service.createPurchase(
      {
        supplier_id: 'supplier-1',
        items: [{ product_id: 'product-kg', quantity: 0.875, unit_cost: 40 }],
      },
      'org-1',
      'user-1',
    );

    expect(context.managerProductRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-kg', stock: 1 }),
    );
  });

  it('creates manual adjustment movement and updates stock', async () => {
    const context = createService();
    context.managerUserRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.managerProductRepository.findOneBy.mockResolvedValue({
      id: 'product-1',
      organization_id: 'org-1',
      stock: 5,
    });
    context.inventoryMovementsRepository.findOne.mockResolvedValue({
      id: 'movement-1',
      organization_id: 'org-1',
      movement_type: 'ADJUSTMENT',
      quantity: -1.5,
      previous_stock: 5,
      new_stock: 3.5,
    });

    await context.service.createAdjustment(
      { product_id: 'product-1', quantity: -1.5, reason: 'Merma' },
      'org-1',
      'user-1',
    );

    expect(context.managerProductRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ stock: 3.5 }),
    );
    expect(context.managerMovementRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: 'ADJUSTMENT',
        quantity: -1.5,
        previous_stock: 5,
        new_stock: 3.5,
      }),
    );
  });

  it('rejects adjustment that results in negative stock', async () => {
    const context = createService();
    context.managerUserRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.managerProductRepository.findOneBy.mockResolvedValue({
      id: 'product-1',
      organization_id: 'org-1',
      stock: 1,
    });

    await expect(
      context.service.createAdjustment(
        { product_id: 'product-1', quantity: -1.5 },
        'org-1',
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
