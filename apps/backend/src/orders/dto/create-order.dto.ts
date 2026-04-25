import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderOrigin, OrderStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  product_id!: string;

  @ApiProperty({ example: 3 })
  quantity!: number;

  @ApiProperty({ example: 250.5 })
  unit_price!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  client_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  user_id!: string;

  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.PENDING_REVIEW })
  status?: OrderStatus;

  @ApiProperty({ enum: OrderOrigin, example: OrderOrigin.WHATSAPP })
  origin!: OrderOrigin;

  @ApiProperty({ type: [CreateOrderItemDto] })
  items!: CreateOrderItemDto[];
}
