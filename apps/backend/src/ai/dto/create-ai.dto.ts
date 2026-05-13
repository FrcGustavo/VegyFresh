import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAiDto {
  @ApiProperty({ example: 'Necesito 10 kg de tomate y 5 de cebolla' })
  message!: string;

  @ApiPropertyOptional({
    example: { channel: 'whatsapp', customerPhone: '5491122334455' },
    type: 'object',
    additionalProperties: true,
  })
  context?: Record<string, unknown>;
}
