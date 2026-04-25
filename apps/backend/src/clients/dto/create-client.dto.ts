import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  @ApiProperty({ example: 'Supermercado La Esquina' })
  name!: string;

  @ApiProperty({ example: '+5491112345678' })
  phone_number!: string;

  @ApiPropertyOptional({ example: 'cliente@example.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: 'Av. Siempreviva 742', nullable: true })
  address?: string | null;

  @ApiPropertyOptional({ example: 'https://example.com/logo.png', nullable: true })
  avatar_url?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true })
  price_list_id?: number | null;
}
