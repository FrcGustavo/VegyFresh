import { ApiProperty } from '@nestjs/swagger';

export class CreatePriceListDto {
  /** Price list name unique within the organization. */
  @ApiProperty({ example: 'Lista Minorista' })
  name!: string;
}
