import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../orders/entities/order.entity';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';
import { PortalOrdersQueryDto } from './dto/portal-orders-query.dto';

@Injectable()
export class PortalOrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
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

  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
    min: number,
  ) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < min) {
      return fallback;
    }
    return parsed;
  }
}
