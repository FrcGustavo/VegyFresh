import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateClientDto {
  /** Client's display or business name. */
  @ApiProperty({ example: 'Supermercado La Esquina' })
  name!: string;

  /** Primary contact phone number, including country code when applicable. */
  @ApiProperty({ example: '+5491112345678' })
  phone_number!: string;

  /** Primary contact email address. */
  @ApiPropertyOptional({ example: 'cliente@example.com', nullable: true })
  email?: string | null;

  /** Country used in the delivery or billing address. */
  @ApiPropertyOptional({ example: 'México', nullable: true })
  country?: string | null;

  /** State or administrative region. */
  @ApiPropertyOptional({ example: 'Jalisco', nullable: true })
  state?: string | null;

  /** City or municipality. */
  @ApiPropertyOptional({ example: 'Guadalajara', nullable: true })
  city?: string | null;

  /** Postal code associated with the address. */
  @ApiPropertyOptional({ example: '44100', nullable: true })
  postal_code?: string | null;

  /** Street name and any additional address details. */
  @ApiPropertyOptional({ example: 'Av. Siempreviva 742', nullable: true })
  address?: string | null;

  /** Neighborhood or suburb. */
  @ApiPropertyOptional({ example: 'Centro', nullable: true })
  suburb?: string | null;

  /** Exterior street number. */
  @ApiPropertyOptional({ example: '123', nullable: true })
  external_number?: string | null;

  /** Interior, suite, or apartment number. */
  @ApiPropertyOptional({ example: '4B', nullable: true })
  internal_number?: string | null;

  /** Public URL or data URL for the client's avatar. */
  @ApiPropertyOptional({
    example: 'https://example.com/logo.png',
    nullable: true,
  })
  avatar_url?: string | null;

  /** Price list assigned to the client. */
  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    nullable: true,
  })
  price_list_id?: string | null;
}
