import { OrderOrigin, OrderStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  product_id!: number;
  quantity!: number;
  unit_price!: number;
}

export class CreateOrderDto {
  client_id!: number;
  user_id!: number;
  status?: OrderStatus;
  origin!: OrderOrigin;
  items!: CreateOrderItemDto[];
}
