import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'TOM-001' })
  sku!: string;

  @ApiProperty({ example: 'Tomate perita' })
  name!: string;

  @ApiPropertyOptional({ example: 'Tomate fresco de temporada', nullable: true })
  description?: string | null;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  supplier_id!: string;

  @ApiPropertyOptional({ example: 100 })
  stock?: number;

  @ApiPropertyOptional({ example: ['https://example.com/img1.jpg'], type: [String] })
  images?: string[];
}
