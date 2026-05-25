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
  @MaxLength(160)
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
  @MaxLength(160)
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
  @MaxLength(255)
  @IsOptional()
  address?: string | null;
}
