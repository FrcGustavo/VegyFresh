import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  @ApiProperty({ example: 'Proveedor SA' })
  name!: string;

  @ApiPropertyOptional({ example: 'contacto@proveedor.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '+525512345678', nullable: true })
  phone_number?: string | null;

  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  logo_url?: string | null;
}
