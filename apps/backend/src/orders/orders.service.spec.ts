import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderOrigin, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../catalog/products/entities/product.entity';
import { OrganizationUser } from '../organizations/entities/organization-user.entity';

const ORGANIZATION_ID = 'organization-1';
const CLIENT_ID = 'client-1';
const USER_ID = 'user-1';
const PRODUCT_ID = 'product-1';
const ORDER_ID = 'order-1';

type TransactionRepositoryMap = {
  orderRepository: Pick<
    Repository<Order>,
    'create' | 'save' | 'findOne' | 'merge'
  > & {
    manager: {
      transaction: (
        handler: (manager: {
          getRepository: (entity: unknown) => unknown;
          query: () => Promise<Array<{ folio: number }>>;
        }) => Promise<unknown>,
      ) => Promise<unknown>;
    };
  };
  orderItemRepository: Pick<
    Repository<OrderItem>,
    'create' | 'save' | 'delete'
  >;
  clientsRepository: Pick<Repository<Client>, 'findOneBy'>;
  usersRepository: Pick<Repository<User>, 'findOneBy'>;
  productsRepository: Pick<Repository<Product>, 'findBy'>;
  organizationUsersRepository: Pick<Repository<OrganizationUser>, 'findOneBy'>;
};

function buildExistingOrder(): Order {
  return {
    id: ORDER_ID,
    client_id: CLIENT_ID,
    user_id: USER_ID,
    organization_id: ORGANIZATION_ID,
    total_amount: 20,
    folio: 'P00001',
    description: null,
    status: OrderStatus.PENDING_REVIEW,
    origin: OrderOrigin.MANUAL,
    items: [],
    delivery_date: null,
    created_at: new Date(),
  };
}

function createService() {
  const orderRepository: TransactionRepositoryMap['orderRepository'] = {
    create: (payload) => payload as Order,
    save: (payload) => Promise.resolve({ ...(payload as Order), id: ORDER_ID }),
    findOne: () => Promise.resolve(buildExistingOrder()),
    merge: (target, source) => Object.assign(target, source),
    manager: {
      transaction: (handler) =>
        handler({
          getRepository: (entity) => {
            if (entity === Order) return orderRepository;
            if (entity === OrderItem) return orderItemRepository;
            if (entity === Client) return clientsRepository;
            if (entity === User) return usersRepository;
            if (entity === Product) return productsRepository;
            if (entity === OrganizationUser) return organizationUsersRepository;
            throw new Error('Unsupported repository');
          },
          query: () => Promise.resolve([{ folio: 1 }]),
        }),
    },
  };

  const orderItemRepository: TransactionRepositoryMap['orderItemRepository'] = {
    create: (payload) => payload as OrderItem,
    save: () => Promise.resolve([]),
    delete: () => Promise.resolve({} as never),
  };

  const clientsRepository: TransactionRepositoryMap['clientsRepository'] = {
    findOneBy: () => Promise.resolve({ id: CLIENT_ID } as Client),
  };

  const usersRepository: TransactionRepositoryMap['usersRepository'] = {
    findOneBy: () => Promise.resolve({ id: USER_ID } as User),
  };

  const productsRepository: TransactionRepositoryMap['productsRepository'] = {
    findBy: () =>
      Promise.resolve([
        { id: PRODUCT_ID, organization_id: ORGANIZATION_ID } as Product,
      ]),
  };

  const organizationUsersRepository: TransactionRepositoryMap['organizationUsersRepository'] =
    {
      findOneBy: () =>
        Promise.resolve({
          id: 'membership-1',
          user_id: USER_ID,
          organization_id: ORGANIZATION_ID,
          is_active: true,
        } as OrganizationUser),
    };

  const service = new OrdersService(
    orderRepository as Repository<Order>,
    orderItemRepository as Repository<OrderItem>,
    clientsRepository as Repository<Client>,
    usersRepository as Repository<User>,
    productsRepository as Repository<Product>,
    organizationUsersRepository as Repository<OrganizationUser>,
  );

  return {
    service,
    orderItemRepository,
  };
}

describe('OrdersService', () => {
  it('assigns organization_id to order items on create', async () => {
    const { service, orderItemRepository } = createService();
    const createOrderItemSpy = jest.spyOn(orderItemRepository, 'create');
    jest.spyOn(service, 'findOne').mockResolvedValue(buildExistingOrder());

    await service.create(
      {
        client_id: CLIENT_ID,
        user_id: USER_ID,
        status: OrderStatus.PENDING_REVIEW,
        origin: OrderOrigin.MANUAL,
        items: [{ product_id: PRODUCT_ID, quantity: 2, unit_price: 10 }],
      },
      ORGANIZATION_ID,
    );

    expect(createOrderItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: ORGANIZATION_ID,
      }),
    );
  });

  it('uses organization_id when recreating items on update', async () => {
    const { service, orderItemRepository } = createService();
    const createOrderItemSpy = jest.spyOn(orderItemRepository, 'create');
    const deleteOrderItemsSpy = jest.spyOn(orderItemRepository, 'delete');
    jest.spyOn(service, 'findOne').mockResolvedValue(buildExistingOrder());

    await service.update(
      ORDER_ID,
      {
        items: [{ product_id: PRODUCT_ID, quantity: 3, unit_price: 8 }],
      },
      ORGANIZATION_ID,
    );

    expect(deleteOrderItemsSpy).toHaveBeenCalledWith({
      order_id: ORDER_ID,
      organization_id: ORGANIZATION_ID,
    });
    expect(createOrderItemSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: ORGANIZATION_ID,
      }),
    );
  });
});
