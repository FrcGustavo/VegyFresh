import { BadRequestException } from '@nestjs/common';
import {
  InventoryMovement,
  InventoryMovementType,
} from 'src/inventory/entities/inventory-movement.entity';
import { InventoryService } from 'src/inventory/inventory.service';
import type { DeepPartial } from 'typeorm';

type TransactionManager = {
  getRepository: (entity: { name?: string }) => unknown;
};

describe('InventoryService', () => {
  const makeService = () => {
    const productsRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      save: jest.fn(),
    };
    const usersRepository = {
      findOneBy: jest.fn(),
    };
    const movementsRepository = {
      create: jest.fn(
        (value: DeepPartial<InventoryMovement>): InventoryMovement =>
          value as InventoryMovement,
      ),
      save: jest.fn(
        (value: DeepPartial<InventoryMovement>): Promise<InventoryMovement> =>
          Promise.resolve({
            ...value,
            id: 'movement-1',
          } as InventoryMovement),
      ),
    };
    const inventoryMovementsRepository = {
      find: jest.fn(),
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn(
          <Result>(
            callback: (manager: TransactionManager) => Promise<Result>,
          ): Promise<Result> =>
            callback({
              getRepository: jest.fn((entity: { name?: string }): unknown => {
                if (entity?.name === 'Product') return productsRepository;
                if (entity?.name === 'User') return usersRepository;
                if (entity?.name === 'InventoryMovement')
                  return movementsRepository;
                return undefined;
              }),
            }),
        ),
      },
    };

    const service = new InventoryService(
      inventoryMovementsRepository as never,
      productsRepository as never,
      usersRepository as never,
    );

    return {
      service,
      productsRepository,
      usersRepository,
      movementsRepository,
      inventoryMovementsRepository,
    };
  };

  it('lists inventory scoped by organization', async () => {
    const context = makeService();
    context.productsRepository.find.mockResolvedValue([{ id: 'product-1' }]);

    await context.service.findInventory('org-1');

    expect(context.productsRepository.find).toHaveBeenCalledWith({
      where: { organization_id: 'org-1' },
      relations: { supplier: true },
      order: { name: 'ASC' },
    });
  });

  it('rejects zero-quantity adjustments', async () => {
    const context = makeService();
    context.usersRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.productsRepository.findOneBy.mockResolvedValue({
      id: 'product-1',
      organization_id: 'org-1',
      stock: 10,
    });

    await expect(
      context.service.createAdjustment(
        { product_id: 'product-1', quantity: 0, reason: 'No-op' },
        'org-1',
        'user-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates adjustment movement and updates stock', async () => {
    const context = makeService();
    context.usersRepository.findOneBy.mockResolvedValue({
      id: 'user-1',
      organization_id: 'org-1',
    });
    context.productsRepository.findOneBy.mockResolvedValue({
      id: 'product-1',
      organization_id: 'org-1',
      stock: 10,
    });
    context.inventoryMovementsRepository.findOne.mockResolvedValue({
      id: 'movement-1',
      organization_id: 'org-1',
    });

    const movement = await context.service.createAdjustment(
      { product_id: 'product-1', quantity: -2.5, reason: 'Damage' },
      'org-1',
      'user-1',
    );

    expect(context.productsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'product-1', stock: 7.5 }),
    );
    expect(context.movementsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        movement_type: InventoryMovementType.ADJUSTMENT,
        quantity: -2.5,
        previous_stock: 10,
        new_stock: 7.5,
        reason: 'Damage',
      }),
    );
    expect(movement).toEqual({ id: 'movement-1', organization_id: 'org-1' });
  });
});
