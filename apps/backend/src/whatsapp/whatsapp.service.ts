import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';
import { AiService } from '../ai/ai.service';
import config from '../config';

type MetaMessage = {
  from: string;
  text?: { body?: string };
};

type MetaWebhookPayload = {
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: MetaMessage[] };
    }>;
  }>;
};

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    @Inject(config.KEY) private readonly appConfig: ConfigType<typeof config>,
    private readonly aiService: AiService,
  ) {}

  verifyWebhook(
    mode?: string,
    verifyToken?: string,
    challenge?: string,
  ): string | null {
    const expectedToken = this.appConfig.whatsapp.verifyToken;

    if (
      mode === 'subscribe' &&
      challenge &&
      verifyToken &&
      expectedToken &&
      verifyToken === expectedToken
    ) {
      return challenge;
    }

    return null;
  }

  async handleWebhook(
    payload: unknown,
    signature?: string,
    rawBody?: string,
  ): Promise<void> {
    if (!this.isValidSignature(signature, rawBody)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const messages = this.extractMessages(payload);
    for (const message of messages) {
      const incomingText = message.text?.body?.trim();
      if (!incomingText) {
        continue;
      }

      const interpretation = await this.aiService.interpretMessage(
        incomingText,
        {
          channel: 'whatsapp',
          from: message.from,
        },
      );

      await this.sendTextMessage(message.from, interpretation.replyText);
    }
  }

  async sendTextMessage(to: string, text: string) {
    if (!to || !text) {
      throw new BadRequestException('Both to and text are required');
    }

    const { accessToken, phoneNumberId, apiVersion } = this.appConfig.whatsapp;
    const version = apiVersion ?? 'v20.0';

    if (!accessToken || !phoneNumberId) {
      this.logger.warn(
        'WHATSAPP_ACCESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID not configured. Message not sent.',
      );
      return { sent: false, skipped: 'missing_credentials' };
    }

    const url = `https://graph.facebook.com/${version}/${phoneNumberId}/messages`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: text },
      }),
    });

    const data = (await response.json()) as {
      messages?: Array<{ id?: string }>;
      error?: { message?: string };
    };

    if (!response.ok) {
      const message =
        data.error?.message ?? `Meta API error ${response.status}`;
      this.logger.error(`Failed to send WhatsApp message: ${message}`);
      return { sent: false, error: message };
    }

    return {
      sent: true,
      providerMessageId: data.messages?.[0]?.id ?? null,
    };
  }

  private isValidSignature(signature?: string, rawBody?: string): boolean {
    const appSecret = this.appConfig.whatsapp.appSecret;

    if (!appSecret) {
      this.logger.error(
        'META_APP_SECRET is not configured. Webhook requests cannot be validated.',
      );
      return false;
    }

    if (!signature || !rawBody) {
      return false;
    }

    const expected = `sha256=${createHmac('sha256', appSecret).update(rawBody).digest('hex')}`;
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer);
  }

  private extractMessages(payload: unknown): MetaMessage[] {
    if (!payload || typeof payload !== 'object') {
      return [];
    }

    const metaPayload = payload as MetaWebhookPayload;
    const entries = metaPayload.entry ?? [];

    return entries.flatMap((entry) =>
      (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
    );
  }
}
