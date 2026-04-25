import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'hashed_password' })
  password_hash!: string;

  @ApiProperty({ example: 1 })
  role_id!: number;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png', nullable: true })
  avatar_url?: string | null;
}
