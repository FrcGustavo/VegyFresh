import { ApiProperty } from '@nestjs/swagger';

export class CreateProductPriceDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  product_id!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  price_list_id!: string;

  @ApiProperty({ example: 150.75 })
  price!: number;
}
