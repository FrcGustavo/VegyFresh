import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSupplierDto {
  /** Supplier's business or display name. */
  @ApiProperty({ example: 'Proveedor SA' })
  name!: string;

  /** Primary contact email address. */
  @ApiPropertyOptional({ example: 'contacto@proveedor.com', nullable: true })
  email?: string | null;

  /** Primary contact phone number. */
  @ApiPropertyOptional({ example: '+525512345678', nullable: true })
  phone_number?: string | null;

  /** Public URL or data URL for the supplier's logo. */
  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  logo_url?: string | null;
}
