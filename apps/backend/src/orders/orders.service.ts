import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateOrderDto, CreateOrderItemDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order, OrderStatus } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../catalog/products/entities/product.entity';

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
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    return this.ordersRepository.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);
      const client = await this.findClientOrFail(createOrderDto.client_id);
      const user = await this.findUserOrFail(createOrderDto.user_id);
      const itemsPayload = await this.buildItems(createOrderDto.items);

      const order = orderRepository.create({
        client_id: client.id,
        client,
        user_id: user.id,
        user,
        total_amount: itemsPayload.totalAmount,
        status: createOrderDto.status ?? OrderStatus.PENDING_REVIEW,
        origin: createOrderDto.origin,
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

      return this.findOne(savedOrder.id);
    });
  }

  findAll() {
    return this.ordersRepository.find({
      relations: {
        client: true,
        user: true,
        items: { product: true },
      },
      order: { id: 'ASC' },
    });
  }

  async findOne(id: number) {
    const order = await this.ordersRepository.findOne({
      where: { id },
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

  async update(id: number, updateOrderDto: UpdateOrderDto) {
    return this.ordersRepository.manager.transaction(async (manager) => {
      const orderRepository = manager.getRepository(Order);
      const orderItemRepository = manager.getRepository(OrderItem);
      const existingOrder = await orderRepository.findOne({ where: { id } });

      if (!existingOrder) {
        throw new NotFoundException(`Order with id ${id} not found`);
      }

      const client =
        updateOrderDto.client_id !== undefined
          ? await this.findClientOrFail(updateOrderDto.client_id)
          : await this.findClientOrFail(existingOrder.client_id);
      const user =
        updateOrderDto.user_id !== undefined
          ? await this.findUserOrFail(updateOrderDto.user_id)
          : await this.findUserOrFail(existingOrder.user_id);
      const itemsPayload =
        updateOrderDto.items !== undefined
          ? await this.buildItems(updateOrderDto.items)
          : null;

      orderRepository.merge(existingOrder, {
        client_id: client.id,
        client,
        user_id: user.id,
        user,
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

      return this.findOne(existingOrder.id);
    });
  }

  async remove(id: number) {
    const order = await this.findOne(id);
    await this.ordersRepository.remove(order);

    return { id, deleted: true };
  }

  private async findClientOrFail(id: number) {
    const client = await this.clientsRepository.findOneBy({ id });
    if (!client) {
      throw new NotFoundException(`Client with id ${id} not found`);
    }

    return client;
  }

  private async findUserOrFail(id: number) {
    const user = await this.usersRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  private async buildItems(items: CreateOrderItemDto[]) {
    const productIds = [...new Set(items.map((item) => item.product_id))];
    const products = await this.productsRepository.findByIds(productIds);
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
}
