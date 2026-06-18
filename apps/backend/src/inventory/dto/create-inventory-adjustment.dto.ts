import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateInventoryAdjustmentDto {
  /** Product whose inventory will be adjusted. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  product_id!: string;

  /** Signed stock delta; positive adds stock and negative removes it. */
  @ApiProperty({
    example: -1.25,
    description:
      'Signed quantity delta. Positive increases stock, negative reduces.',
  })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  quantity!: number;

  /** Human-readable reason for the manual adjustment. */
  @ApiPropertyOptional({ example: 'Ajuste por merma', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string | null;
}
