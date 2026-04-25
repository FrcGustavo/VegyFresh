import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderOrigin, OrderStatus } from '../entities/order.entity';

export class CreateOrderItemDto {
  @ApiProperty({ example: 1 })
  product_id!: number;

  @ApiProperty({ example: 3 })
  quantity!: number;

  @ApiProperty({ example: 250.5 })
  unit_price!: number;
}

export class CreateOrderDto {
  @ApiProperty({ example: 1 })
  client_id!: number;

  @ApiProperty({ example: 1 })
  user_id!: number;

  @ApiPropertyOptional({ enum: OrderStatus, example: OrderStatus.PENDING_REVIEW })
  status?: OrderStatus;

  @ApiProperty({ enum: OrderOrigin, example: OrderOrigin.WHATSAPP })
  origin!: OrderOrigin;

  @ApiProperty({ type: [CreateOrderItemDto] })
  items!: CreateOrderItemDto[];
}
