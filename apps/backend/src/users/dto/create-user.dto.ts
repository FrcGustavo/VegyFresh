import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'super-secure-password' })
  password!: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  role_id!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.png',
    nullable: true,
  })
  avatar_url?: string | null;
}
