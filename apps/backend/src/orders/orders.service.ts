import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { In, Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../catalog/products/entities/product.entity';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { FoliosService } from '../folios/folios.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    private readonly foliosService: FoliosService,
  ) {}

  async create(createOrderDto: CreateOrderDto, organizationId: string) {
    const savedOrderId = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);
        const clientsRepository = manager.getRepository(Client);
        const usersRepository = manager.getRepository(User);
        const productsRepository = manager.getRepository(Product);
        const client = await this.findClientOrFail(
          createOrderDto.client_id,
          organizationId,
          clientsRepository,
        );
        const user = await this.findUserOrFail(
          createOrderDto.user_id,
          organizationId,
          usersRepository,
        );
        const itemsPayload = await this.buildItems(
          createOrderDto.items,
          organizationId,
          productsRepository,
        );
        const orderFolio = await this.foliosService.generateFolio(
          'orders',
          organizationId,
        );

        const order = orderRepository.create({
          client_id: client.id,
          client,
          user_id: user.id,
          user,
          organization_id: organizationId,
          total_amount: itemsPayload.totalAmount,
          folio: orderFolio,
          status: createOrderDto.status ?? OrderStatus.PENDING_REVIEW,
          origin: createOrderDto.origin,
          delivery_date: createOrderDto.delivery_date
            ? new Date(createOrderDto.delivery_date)
            : null,
        });

        const savedOrder = await orderRepository.save(order);
        const orderItems = itemsPayload.items.map((item) =>
          orderItemRepository.create({
            order_id: savedOrder.id,
            order: savedOrder,
            product_id: item.product.id,
            product: item.product,
            quantity: item.quantity,
            unit_price: item.unit_price,
            subtotal: item.subtotal,
          }),
        );

        await orderItemRepository.save(orderItems);

        return savedOrder.id;
      },
    );

    return this.findOne(savedOrderId, organizationId);
  }

  findAll(query: FindOrdersQueryDto = {}, organizationId: string) {
    const orderBy = this.getOrderByColumn(query.order_by);
    const direction = query.order === 'asc' ? 'ASC' : 'DESC';
    const limit = this.parseInteger(query.limit, 25, 1);
    const offset = this.parseInteger(query.offset, 0, 0);

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.client', 'client')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy(orderBy, direction)
      .addOrderBy('order.id', 'ASC');

    qb.andWhere('order.organization_id = :organizationId', {
      organizationId,
    });

    this.applyCreatedAtFilter(
      qb,
      query.created_filter,
      query.created_from,
      query.created_to,
    );

    qb.take(limit);
    qb.skip(offset);

    return qb.getMany();
  }

  async findOne(id: string, organizationId: string) {
    const order = await this.ordersRepository.findOne({
      where: { id, organization_id: organizationId },
      relations: {
        client: true,
        user: true,
        items: { product: true },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with id ${id} not found`);
    }

    return order;
  }

  async update(
    id: string,
    updateOrderDto: UpdateOrderDto,
    organizationId: string,
  ) {
    const updatedOrderId = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);
        const clientsRepository = manager.getRepository(Client);
        const usersRepository = manager.getRepository(User);
        const productsRepository = manager.getRepository(Product);
        const existingOrder = await orderRepository.findOne({
          where: { id, organization_id: organizationId },
        });

        if (!existingOrder) {
          throw new NotFoundException(`Order with id ${id} not found`);
        }

        const client =
          updateOrderDto.client_id !== undefined
            ? await this.findClientOrFail(
                updateOrderDto.client_id,
                organizationId,
                clientsRepository,
              )
            : await this.findClientOrFail(
                existingOrder.client_id,
                organizationId,
                clientsRepository,
              );
        const user =
          updateOrderDto.user_id !== undefined
            ? await this.findUserOrFail(
                updateOrderDto.user_id,
                organizationId,
                usersRepository,
              )
            : await this.findUserOrFail(
                existingOrder.user_id,
                organizationId,
                usersRepository,
              );
        const itemsPayload =
          updateOrderDto.items !== undefined
            ? await this.buildItems(
                updateOrderDto.items,
                organizationId,
                productsRepository,
              )
            : null;

        orderRepository.merge(existingOrder, {
          client_id: client.id,
          client,
          user_id: user.id,
          user,
          organization_id: organizationId,
          delivery_date:
            updateOrderDto.delivery_date !== undefined
              ? new Date(updateOrderDto.delivery_date)
              : existingOrder.delivery_date,
          status: updateOrderDto.status ?? existingOrder.status,
          origin: updateOrderDto.origin ?? existingOrder.origin,
          total_amount: itemsPayload?.totalAmount ?? existingOrder.total_amount,
        });

        await orderRepository.save(existingOrder);

        if (itemsPayload) {
          await orderItemRepository.delete({ order_id: existingOrder.id });
          const orderItems = itemsPayload.items.map((item) =>
            orderItemRepository.create({
              order_id: existingOrder.id,
              order: existingOrder,
              product_id: item.product.id,
              product: item.product,
              quantity: item.quantity,
              unit_price: item.unit_price,
              subtotal: item.subtotal,
            }),
          );
          await orderItemRepository.save(orderItems);
        }

        return existingOrder.id;
      },
    );

    return this.findOne(updatedOrderId, organizationId);
  }

  async remove(id: string, organizationId: string) {
    const order = await this.findOne(id, organizationId);
    order.status = OrderStatus.CANCELED;
    await this.ordersRepository.save(order);

    return { id, canceled: true };
  }

  private async findClientOrFail(
    id: string,
    organizationId: string,
    clientsRepository: Repository<Client> = this.clientsRepository,
  ) {
    const client = await clientsRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!client) {
      throw new NotFoundException(`Client with id ${id} not found`);
    }

    return client;
  }

  private async findUserOrFail(
    id: string,
    organizationId: string,
    usersRepository: Repository<User> = this.usersRepository,
  ) {
    const user = await usersRepository.findOneBy({
      id,
      organization_id: organizationId,
    });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  private async buildItems(
    items: CreateOrderItemDto[],
    organizationId: string,
    productsRepository: Repository<Product> = this.productsRepository,
  ) {
    if (items.length === 0) {
      throw new BadRequestException('Order must include at least one item');
    }

    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await productsRepository.findBy({
      id: In(productIds),
      organization_id: organizationId,
    });
    const productMap = new Map(
      products.map((product) => [product.id, product]),
    );

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.product_id);
      if (!product) {
        throw new NotFoundException(
          `Product with id ${item.product_id} not found`,
        );
      }

      const subtotal = Number(item.quantity) * Number(item.unit_price);
      return {
        product,
        quantity: item.quantity,
        unit_price: item.unit_price,
        subtotal,
      };
    });

    return {
      items: normalizedItems,
      totalAmount: normalizedItems.reduce(
        (sum, item) => sum + item.subtotal,
        0,
      ),
    };
  }

  private getOrderByColumn(orderBy?: string) {
    const allowedColumns: Record<string, string> = {
      id: 'order.id',
      folio: 'order.folio',
      description: 'order.description',
      status: 'order.status',
      origin: 'order.origin',
      total_amount: 'order.total_amount',
      created_at: 'order.created_at',
      delivery_date: 'order.delivery_date',
      client: 'client.name',
      client_name: 'client.name',
    };

    if (orderBy && allowedColumns[orderBy]) {
      return allowedColumns[orderBy];
    }

    return 'order.created_at';
  }

  private parseInteger(value: unknown, fallback: number, minimum: number) {
    const parsedValue = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue < minimum) {
      return fallback;
    }

    return parsedValue;
  }

  private applyCreatedAtFilter(
    qb: ReturnType<Repository<Order>['createQueryBuilder']>,
    createdFilter?: 'all' | 'today' | 'range',
    createdFrom?: string,
    createdTo?: string,
  ) {
    if (createdFilter === 'today') {
      qb.andWhere(`order.created_at >= CURRENT_DATE`).andWhere(
        `order.created_at < CURRENT_DATE + INTERVAL '1 day'`,
      );
      return;
    }

    if (createdFilter !== 'range') {
      return;
    }

    if (createdFrom) {
      qb.andWhere('order.created_at >= :createdFrom', {
        createdFrom: `${createdFrom}T00:00:00.000Z`,
      });
    }

    if (createdTo) {
      const endDate = new Date(`${createdTo}T00:00:00.000Z`);
      endDate.setUTCDate(endDate.getUTCDate() + 1);
      qb.andWhere('order.created_at < :createdTo', {
        createdTo: endDate.toISOString(),
      });
    }
  }
}
