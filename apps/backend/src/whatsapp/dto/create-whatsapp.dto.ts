import { ApiProperty } from '@nestjs/swagger';

export class CreateWhatsappDto {
  @ApiProperty({ example: '5491122334455' })
  to!: string;

  @ApiProperty({ example: 'Hola! Ya recibimos tu pedido.' })
  text!: string;
}
