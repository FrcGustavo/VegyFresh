import { ApiProperty } from '@nestjs/swagger';
import { ProductUnit } from '../../catalog/products/entities/product.entity';
import { OrderOrigin, OrderStatus } from '../../orders/entities/order.entity';

const decimal = {
  oneOf: [{ type: 'number' as const }, { type: 'string' as const }],
};

export class PortalProductResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() folio!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty() supplier_id!: string;
  @ApiProperty() organization_id!: string;
  @ApiProperty(decimal) stock!: number | string;
  @ApiProperty({ enum: ProductUnit }) unit!: ProductUnit;
  @ApiProperty({ type: [String] }) images!: string[];
  @ApiProperty({ type: String, format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: String, format: 'date-time' }) updatedAt!: string;
}

export class PortalOrderItemResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() order_id!: string;
  @ApiProperty() product_id!: string;
  @ApiProperty(decimal) quantity!: number | string;
  @ApiProperty(decimal) unit_price!: number | string;
  @ApiProperty(decimal) subtotal!: number | string;
  @ApiProperty({ type: () => PortalProductResponseDto })
  product!: PortalProductResponseDto;
}

export class PortalOrderResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() client_id!: string;
  @ApiProperty() user_id!: string;
  @ApiProperty() organization_id!: string;
  @ApiProperty(decimal) total_amount!: number | string;
  @ApiProperty() folio!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty({ enum: OrderOrigin }) origin!: OrderOrigin;
  @ApiProperty({ type: () => [PortalOrderItemResponseDto] })
  items!: PortalOrderItemResponseDto[];
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  delivery_date!: string | null;
  @ApiProperty({ type: String, format: 'date-time' }) created_at!: string;
}
