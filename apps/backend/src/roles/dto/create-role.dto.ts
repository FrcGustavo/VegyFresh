import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRoleDto {
  @ApiProperty({ example: 'admin' })
  name!: string;

  @ApiPropertyOptional({
    example: [{ action: 'read', resource: 'products' }],
    type: 'array',
    items: { type: 'object' },
  })
  permissions?: Record<string, unknown>[];
}
