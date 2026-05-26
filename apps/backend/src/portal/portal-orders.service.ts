import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { In, Repository } from 'typeorm';
import { Order, OrderOrigin, OrderStatus } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../catalog/products/entities/product.entity';
import { Client } from '../clients/entities/client.entity';
import { ProductPrice } from '../catalog/product-prices/entities/product-price.entity';
import { User } from '../users/entities/user.entity';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';
import { PortalOrdersQueryDto } from './dto/portal-orders-query.dto';
import { PortalCreateOrderDto } from './dto/portal-create-order.dto';
import { PortalCancelOrderDto } from './dto/portal-cancel-order.dto';

@Injectable()
export class PortalOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemsRepository: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productsRepository: Repository<Product>,
    @InjectRepository(ProductPrice)
    private readonly productPricesRepository: Repository<ProductPrice>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly configService: ConfigService,
  ) {}

  async findAll(user: AuthenticatedPortalClient, query: PortalOrdersQueryDto) {
    const page = this.parsePositiveInt(query.page, 1, 1);
    const pageSize = this.parsePositiveInt(query.pageSize, 20, 1);
    const includeCanceled = query.includeCanceled === 'true';
    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .where('order.organization_id = :organizationId', {
        organizationId: user.organization_id,
      })
      .andWhere('order.client_id = :clientId', { clientId: user.sub })
      .orderBy('order.created_at', 'DESC')
      .addOrderBy('order.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (!includeCanceled) {
      qb.andWhere('order.status != :canceledStatus', {
        canceledStatus: OrderStatus.CANCELED,
      });
    }

    if (query.status) {
      qb.andWhere('order.status = :status', { status: query.status });
    }

    return qb.getMany();
  }

  async findOne(user: AuthenticatedPortalClient, orderId: string) {
    const order = await this.ordersRepository.findOne({
      where: {
        id: orderId,
        organization_id: user.organization_id,
      },
      relations: { items: { product: true } },
    });
    if (!order) {
      throw new NotFoundException(`Order with id ${orderId} not found`);
    }
    if (order.client_id !== user.sub) {
      throw new ForbiddenException('You cannot access another client order');
    }

    return order;
  }

  async create(user: AuthenticatedPortalClient, dto: PortalCreateOrderDto) {
    const client = await this.clientsRepository.findOneBy({
      id: user.sub,
      organization_id: user.organization_id,
    });
    if (!client) {
      throw new ForbiddenException('Client is not active in portal');
    }

    const itemsPayload = await this.resolveOrderItems(dto.items, client);
    const userId = await this.resolvePortalSystemUserId(user.organization_id);

    const savedOrderId = await this.ordersRepository.manager.transaction(
      async (manager) => {
        const orderRepository = manager.getRepository(Order);
        const orderItemRepository = manager.getRepository(OrderItem);
        const orderFolio = await this.buildOrderFolio(manager);
        const order = orderRepository.create({
          client_id: client.id,
          client,
          user_id: userId,
          organization_id: user.organization_id,
          total_amount: itemsPayload.totalAmount,
          folio: orderFolio,
          status: OrderStatus.PENDING_REVIEW,
          origin: OrderOrigin.PORTAL,
          description: dto.notes?.trim() || null,
          delivery_date: dto.requestedDeliveryDate
            ? new Date(dto.requestedDeliveryDate)
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

    return this.findOne(user, savedOrderId);
  }

  async cancel(
    user: AuthenticatedPortalClient,
    orderId: string,
    dto: PortalCancelOrderDto,
  ) {
    const order = await this.findOne(user, orderId);
    if (
      order.status !== OrderStatus.PENDING_REVIEW &&
      order.status !== OrderStatus.APPROVED
    ) {
      throw new BadRequestException(
        'Order can only be canceled in PENDING_REVIEW or APPROVED status',
      );
    }

    order.status = OrderStatus.CANCELED;
    await this.ordersRepository.save(order);

    return this.findOne(user, orderId);
  }

  private async resolveOrderItems(
    items: PortalCreateOrderDto['items'],
    client: Client,
  ) {
    if (items.length === 0) {
      throw new BadRequestException('Order must include at least one item');
    }
    if (!client.price_list_id) {
      throw new BadRequestException('Client has no assigned price list');
    }

    const productIds = [...new Set(items.map((item) => item.productId))];
    const products = await this.productsRepository.findBy({
      id: In(productIds),
      organization_id: client.organization_id,
    });
    const productMap = new Map(products.map((product) => [product.id, product]));
    const productPrices = await this.productPricesRepository.findBy({
      organization_id: client.organization_id,
      price_list_id: client.price_list_id,
      product_id: In(productIds),
    });
    const priceMap = new Map(productPrices.map((price) => [price.product_id, price]));

    const normalizedItems = items.map((item) => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundException(`Product with id ${item.productId} not found`);
      }
      const price = priceMap.get(item.productId);
      if (!price) {
        throw new BadRequestException(
          `Product ${product.folio} has no price in client price list`,
        );
      }

      const subtotal = Number(item.quantity) * Number(price.price);
      return {
        product,
        quantity: Number(item.quantity),
        unit_price: Number(price.price),
        subtotal,
      };
    });

    return {
      items: normalizedItems,
      totalAmount: normalizedItems.reduce((sum, item) => sum + item.subtotal, 0),
    };
  }

  private parsePositiveInt(value: string | undefined, fallback: number, min: number) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min) {
      return fallback;
    }
    return parsed;
  }

  private async resolvePortalSystemUserId(organizationId: string) {
    const configuredUserId =
      this.configService.get<string>('PORTAL_SYSTEM_USER_ID') ??
      this.configService.get<string>('config.portalSystemUserId') ??
      this.configService.get<string>('WHATSAPP_BOT_USER_ID') ??
      this.configService.get<string>('config.whatsapp.botUserId');

    if (configuredUserId) {
      const configuredUser = await this.usersRepository.findOneBy({
        id: configuredUserId,
        organization_id: organizationId,
      });
      if (configuredUser) {
        return configuredUser.id;
      }
    }

    const fallbackUser = await this.usersRepository.findOne({
      where: { organization_id: organizationId },
      order: { created_at: 'ASC' },
    });
    if (!fallbackUser) {
      throw new InternalServerErrorException(
        'No system user available for portal order creation',
      );
    }

    return fallbackUser.id;
  }

  private async buildOrderFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('orders_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `P${String(folioNumber).padStart(5, '0')}`;
  }
}
