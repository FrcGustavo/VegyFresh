import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Vegy Fresh Monterrey' })
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    example: 'https://assets.vegyfresh.com/orgs/vegy-fresh/logo.png',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @IsUrl({ require_protocol: true })
  @IsOptional()
  logo_url?: string | null;

  @ApiPropertyOptional({ example: 'Vegy Fresh SA de CV', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  @IsOptional()
  legal_name?: string | null;

  @ApiPropertyOptional({ example: 'admin@vegyfresh.com', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsEmail()
  @IsOptional()
  email?: string | null;

  @ApiPropertyOptional({ example: '+528181234567', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  @IsOptional()
  phone_number?: string | null;

  @ApiPropertyOptional({ example: 'Monterrey, Nuevo Leon', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  @IsOptional()
  address?: string | null;

  @ApiPropertyOptional({
    example: 'P',
    nullable: true,
    description: 'Custom prefix for product folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  product_folio_prefix?: string | null;

  @ApiPropertyOptional({
    example: 'LP',
    nullable: true,
    description: 'Custom prefix for price list folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  price_list_folio_prefix?: string | null;

  @ApiPropertyOptional({
    example: 'O',
    nullable: true,
    description: 'Custom prefix for order folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  order_folio_prefix?: string | null;

  @ApiPropertyOptional({
    example: 'C',
    nullable: true,
    description: 'Custom prefix for client folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  client_folio_prefix?: string | null;

  @ApiPropertyOptional({
    example: 'S',
    nullable: true,
    description: 'Custom prefix for supplier folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  supplier_folio_prefix?: string | null;

  @ApiPropertyOptional({
    example: 'U',
    nullable: true,
    description: 'Custom prefix for user folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  user_folio_prefix?: string | null;

  @ApiPropertyOptional({
    example: 'C',
    nullable: true,
    description: 'Custom prefix for purchase folios',
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MaxLength(10)
  @Matches(/^[A-Za-z0-9]+$/)
  @IsOptional()
  purchase_folio_prefix?: string | null;
}
