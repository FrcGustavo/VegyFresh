import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'super-secure-password' })
  @IsNotEmpty()
  @IsString()
  @MinLength(12)
  password!: string;

  @ApiPropertyOptional({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'Optional if user has exactly one organization membership',
  })
  @IsOptional()
  @IsUUID()
  organization_id?: string;
}
