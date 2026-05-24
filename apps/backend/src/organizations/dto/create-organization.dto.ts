import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Vegy Fresh Monterrey' })
  name!: string;

  @ApiPropertyOptional({ example: 'Vegy Fresh SA de CV', nullable: true })
  legal_name?: string | null;

  @ApiPropertyOptional({ example: 'admin@vegyfresh.com', nullable: true })
  email?: string | null;

  @ApiPropertyOptional({ example: '+528181234567', nullable: true })
  phone_number?: string | null;

  @ApiPropertyOptional({ example: 'Monterrey, Nuevo Leon', nullable: true })
  address?: string | null;
}
