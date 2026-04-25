import { ApiProperty } from '@nestjs/swagger';

export class CreateProductPriceDto {
  @ApiProperty({ example: 1 })
  product_id!: number;

  @ApiProperty({ example: 1 })
  price_list_id!: number;

  @ApiProperty({ example: 150.75 })
  price!: number;
}
