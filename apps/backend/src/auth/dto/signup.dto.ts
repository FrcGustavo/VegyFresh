import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class SignupDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'super-secure-password' })
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiProperty({ example: 'Vegy Fresh Monterrey' })
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  organization_name!: string;

  @ApiPropertyOptional({ example: 'Vegy Fresh SA de CV', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  @IsOptional()
  organization_legal_name?: string | null;

  @ApiPropertyOptional({ example: '+528181234567', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^\+?[0-9]{10,15}$/)
  @IsOptional()
  organization_phone_number?: string | null;

  @ApiPropertyOptional({ example: 'Monterrey, Nuevo Leon', nullable: true })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  @IsOptional()
  organization_address?: string | null;
}
