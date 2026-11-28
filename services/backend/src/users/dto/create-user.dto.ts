import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateUserDto {
  /** User's full display name. */
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  /** Unique contact email for the user profile. */
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  email!: string;

  /** Role assigned to the user in the current organization. */
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @IsUUID()
  role_id!: string;

  /** Public URL or data URL for the user's avatar. */
  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  @ValidateIf((_, value) => value !== null && value !== undefined)
  @IsString()
  @Matches(
    /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$|^https?:\/\/.+$/,
  )
  @IsOptional()
  avatar_url?: string | null;
}
