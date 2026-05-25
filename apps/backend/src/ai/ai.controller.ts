import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';
import { CreateAiDto } from './dto/create-ai.dto';

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('interpret')
  @ApiOperation({
    summary: 'Interpret incoming text with configured AI provider',
  })
  interpret(@Body() createAiDto: CreateAiDto) {
    return this.aiService.interpretMessage(
      createAiDto.message,
      createAiDto.context ?? {},
    );
  }
}
