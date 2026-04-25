import { ApiProperty } from '@nestjs/swagger';

export class CreatePriceListDto {
  @ApiProperty({ example: 'Lista Minorista' })
  name!: string;
}
