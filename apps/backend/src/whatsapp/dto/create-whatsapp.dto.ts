import { ApiProperty } from '@nestjs/swagger';

export class CreateWhatsappDto {
  /** Destination phone number in international format. */
  @ApiProperty({ example: '5491122334455' })
  to!: string;

  /** Plain-text message to send. */
  @ApiProperty({ example: 'Hola! Ya recibimos tu pedido.' })
  text!: string;
}
