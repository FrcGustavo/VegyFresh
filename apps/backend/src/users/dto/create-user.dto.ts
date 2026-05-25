import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { OrganizationUserRole } from '../../organizations/entities/organization-user.entity';

export class CreateUserDto {
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

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  role_id!: string;

  @ApiPropertyOptional({
    example: OrganizationUserRole.MEMBER,
    enum: OrganizationUserRole,
    description:
      'Organization membership role for tenant RBAC. Defaults to member.',
  })
  @IsOptional()
  @IsEnum(OrganizationUserRole)
  organization_role?: OrganizationUserRole;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(/^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$|^https?:\/\/.+$/)
  @IsOptional()
  avatar_url?: string | null;
}
