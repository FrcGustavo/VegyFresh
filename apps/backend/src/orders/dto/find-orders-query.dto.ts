import { ApiPropertyOptional } from '@nestjs/swagger';

export class FindOrdersQueryDto {
  @ApiPropertyOptional({
    description: 'Creation date filter mode',
    example: 'today',
    enum: ['all', 'today', 'range'],
  })
  created_filter?: 'all' | 'today' | 'range';

  @ApiPropertyOptional({
    description: 'Creation date start (YYYY-MM-DD)',
    example: '2026-05-01',
  })
  created_from?: string;

  @ApiPropertyOptional({
    description: 'Creation date end (YYYY-MM-DD)',
    example: '2026-05-23',
  })
  created_to?: string;

  @ApiPropertyOptional({
    description: 'Field to sort by',
    example: 'created_at',
  })
  order_by?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc',
    enum: ['asc', 'desc'],
  })
  order?: 'asc' | 'desc';

  @ApiPropertyOptional({
    description: 'Maximum number of records to return',
    example: 25,
    default: 25,
    type: Number,
  })
  limit?: number;

  @ApiPropertyOptional({
    description: 'Number of records to skip',
    example: 0,
    type: Number,
  })
  offset?: number;
}
