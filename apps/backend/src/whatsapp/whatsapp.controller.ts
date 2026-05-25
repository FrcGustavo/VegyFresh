import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { WhatsappService } from './whatsapp.service';
import { CreateWhatsappDto } from './dto/create-whatsapp.dto';
import { Public } from '../auth/decorators/public.decorator';

type RawBodyRequest = Request & { rawBody?: string };

@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  @Get('webhook')
  @Public()
  @ApiOperation({ summary: 'Verify Meta WhatsApp webhook endpoint' })
  @ApiQuery({ name: 'hub.mode', required: false })
  @ApiQuery({ name: 'hub.verify_token', required: false })
  @ApiQuery({ name: 'hub.challenge', required: false })
  verifyWebhook(
    @Query('hub.mode') mode: string | undefined,
    @Query('hub.verify_token') verifyToken: string | undefined,
    @Query('hub.challenge') challenge: string | undefined,
    @Res() res: Response,
  ) {
    const validChallenge = this.whatsappService.verifyWebhook(
      mode,
      verifyToken,
      challenge,
    );

    if (!validChallenge) {
      return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
    }

    return res.status(HttpStatus.OK).send(validChallenge);
  }

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive incoming webhook events from Meta' })
  async handleWebhook(
    @Body() payload: unknown,
    @Headers('x-hub-signature-256') signature?: string,
    @Req() req?: RawBodyRequest,
  ) {
    await this.whatsappService.handleWebhook(payload, signature, req?.rawBody);
    return { received: true };
  }

  @Post('send')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send a direct WhatsApp message through Meta API' })
  sendMessage(@Body() body: CreateWhatsappDto) {
    return this.whatsappService.sendTextMessage(body.to, body.text);
  }
}
