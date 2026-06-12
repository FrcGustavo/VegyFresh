import { NotFoundException } from '@nestjs/common';
import { OrdersService } from 'src/orders/orders.service';
import { OrderStatus } from 'src/orders/entities/order.entity';

describe('OrdersService', () => {
  it('validates assigned users by users.organization_id', async () => {
    const managerOrderRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
    };
    const managerOrderItemRepository = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    const managerClientsRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'client-1',
        organization_id: 'org-1',
      }),
    };
    const managerUsersRepository = {
      findOneBy: jest.fn().mockResolvedValue(null),
    };
    const managerProductsRepository = {
      findBy: jest.fn().mockResolvedValue([]),
    };
    const foliosService = {
      nextFolio: jest.fn().mockResolvedValue('P1'),
    };
    const manager = {
      getRepository: jest.fn((entity: { name?: string }) => {
        if (entity?.name === 'Order') return managerOrderRepository;
        if (entity?.name === 'OrderItem') return managerOrderItemRepository;
        if (entity?.name === 'Client') return managerClientsRepository;
        if (entity?.name === 'User') return managerUsersRepository;
        if (entity?.name === 'Product') return managerProductsRepository;
        return undefined;
      }),
    };

    const ordersRepository = {
      manager: {
        transaction: jest.fn((callback: (m: typeof manager) => unknown) =>
          callback(manager),
        ),
      },
      findOne: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    const service = new OrdersService(
      ordersRepository as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      foliosService as never,
    );

    await expect(
      service.create(
        {
          client_id: 'client-1',
          user_id: 'user-1',
          status: OrderStatus.PENDING_REVIEW,
          origin: 'MANUAL' as never,
          items: [{ product_id: 'product-1', quantity: 1, unit_price: 10 }],
        },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    expect(managerUsersRepository.findOneBy).toHaveBeenCalledWith({
      id: 'user-1',
      organization_id: 'org-1',
    });
  });
});
