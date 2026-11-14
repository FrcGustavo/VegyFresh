import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductUnit } from '../entities/product.entity';

export class CreateProductDto {
  /** Product's display name. */
  @ApiProperty({ example: 'Tomate perita' })
  name!: string;

  /** Optional product details shown to users and clients. */
  @ApiPropertyOptional({
    example: 'Tomate fresco de temporada',
    nullable: true,
  })
  description?: string | null;

  /** Supplier associated with the product. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  supplier_id!: string;

  /** Initial available stock. */
  @ApiPropertyOptional({ example: 100 })
  stock?: number;

  /** Unit used to measure and sell the product. */
  @ApiPropertyOptional({
    enum: ProductUnit,
    example: ProductUnit.KG,
    default: ProductUnit.PZ,
  })
  unit?: ProductUnit;

  /** Public image URLs associated with the product. */
  @ApiPropertyOptional({
    example: ['https://example.com/img1.jpg'],
    type: [String],
  })
  images?: string[];
}
