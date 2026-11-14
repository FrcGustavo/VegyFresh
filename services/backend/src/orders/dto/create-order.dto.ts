import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderOrigin, OrderStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  /** Product included in the order. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  product_id!: string;

  /** Quantity requested in the product's unit of measure. */
  @ApiProperty({ example: 3 })
  quantity!: number;

  /** Unit price captured when the order is created. */
  @ApiProperty({ example: 250.5 })
  unit_price!: number;
}

export class CreateOrderDto {
  /** Client that owns the order. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  client_id!: string;

  /** User responsible for processing the order. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  user_id!: string;

  /** Initial order workflow status. */
  @ApiPropertyOptional({
    enum: OrderStatus,
    example: OrderStatus.PENDING_REVIEW,
  })
  status?: OrderStatus;

  /** Channel through which the order was received. */
  @ApiProperty({ enum: OrderOrigin, example: OrderOrigin.WHATSAPP })
  origin!: OrderOrigin;

  /** Requested delivery date and time in ISO 8601 format. */
  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    example: '2026-05-23T12:00:00.000Z',
  })
  delivery_date?: string;

  /** Products, quantities, and prices included in the order. */
  @ApiProperty({ type: [CreateOrderItemDto] })
  items!: CreateOrderItemDto[];
}
