import { ApiProperty } from '@nestjs/swagger';

export class CreateProductPriceDto {
  /** Product whose price is being configured. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  product_id!: string;

  /** Price list to which this price belongs. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  price_list_id!: string;

  /** Monetary price for the product in the selected list. */
  @ApiProperty({ example: 150.75 })
  price!: number;
}
