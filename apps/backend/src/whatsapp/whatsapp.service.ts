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
import { ClientsService } from '../clients/clients.service';
import { ProductsService } from '../catalog/products/products.service';
import { Product } from '../catalog/products/entities/product.entity';
import { OrdersService } from '../orders/orders.service';
import { OrderOrigin, OrderStatus } from '../orders/entities/order.entity';
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
    private readonly clientsService: ClientsService,
    private readonly productsService: ProductsService,
    private readonly ordersService: OrdersService,
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
      this.logger.log(`[webhook:verify] ✅ Verification successful`);
      return challenge;
    }

    this.logger.warn(`[webhook:verify] ❌ Verification failed`);
    return null;
  }

  async handleWebhook(
    payload: unknown,
    signature?: string,
    rawBody?: string,
  ): Promise<void> {
    this.logger.log(`[webhook:incoming] signature=${signature ?? 'none'}`);

    if (!this.isValidSignature(signature, rawBody)) {
      this.logger.warn(
        '[webhook:incoming] ❌ Invalid signature — request rejected',
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const messages = this.extractMessages(payload);
    this.logger.log(
      `[webhook:incoming] ✅ Valid signature — messages=${messages.length}`,
    );

    for (const message of messages) {
      const incomingText = message.text?.body?.trim();
      if (!incomingText) {
        continue;
      }

      const normalizedFrom = this.normalizePhone(message.from);
      this.logger.log(
        `[webhook:incoming] normalized phone: ${message.from} → ${normalizedFrom} text="${incomingText}"`,
      );

      await this.processMessage(normalizedFrom, incomingText);
    }
  }

  private async processMessage(phone: string, text: string): Promise<void> {
    const client = await this.clientsService.findByPhone(phone);
    const products = await this.productsService.findAll();

    const catalog = products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
    }));

    const interpretation = await this.aiService.interpretMessage(text, {
      channel: 'whatsapp',
      from: phone,
      clientId: client?.id ?? null,
      products: catalog,
    });

    this.logger.log(
      `[webhook:incoming] AI intent=${interpretation.intent} confidence=${interpretation.confidence} provider=${interpretation.provider}`,
    );

    const hasIntent = interpretation.intent === 'CREATE_ORDER';
    const hasClient = !!client;
    const hasItems =
      Array.isArray(interpretation.extractedData?.items) &&
      (interpretation.extractedData.items as unknown[]).length > 0;

    if (!hasIntent || !hasClient || !hasItems) {
      this.logger.warn(
        `[order:gate] skipping order — hasIntent=${hasIntent} hasClient=${hasClient} hasItems=${hasItems}`,
      );
    }

    if (hasIntent && hasClient && hasItems) {
      await this.createOrderFromInterpretation(
        client.id,
        interpretation.extractedData,
      );
    }

    await this.sendTextMessage(phone, interpretation.replyText);
  }

  private async createOrderFromInterpretation(
    clientId: string,
    extractedData: Record<string, unknown>,
  ): Promise<void> {
    const botUserId = this.appConfig.whatsapp.botUserId;
    if (!botUserId) {
      this.logger.warn(
        '[order:create] WHATSAPP_BOT_USER_ID not configured — skipping order creation',
      );
      return;
    }

    const rawItems = extractedData.items as Array<{
      product_id: string;
      quantity: number;
    }>;

    const validRaw = rawItems.filter((i) => i.product_id && i.quantity > 0);
    if (validRaw.length === 0) {
      this.logger.warn('[order:create] No valid items extracted — skipping');
      return;
    }

    // Load client with its price list
    const client = await this.clientsService.findOne(clientId);
    const priceListId = client.priceList?.id ?? null;

    // Fetch each product from DB and resolve unit_price from client's price list
    const items: Array<{
      product_id: string;
      quantity: number;
      unit_price: number;
    }> = [];

    for (const raw of validRaw) {
      let product: Product;
      try {
        product = await this.productsService.findOne(raw.product_id);
      } catch {
        this.logger.warn(
          `[order:create] Product id=${raw.product_id} not found in DB — skipping item`,
        );
        continue;
      }

      // Resolve price: match client price list, fallback to 0
      let unit_price = 0;
      if (priceListId && product.productPrices?.length) {
        const match = product.productPrices.find(
          (pp) => pp.price_list_id === priceListId,
        );
        if (match) unit_price = match.price;
      }

      this.logger.log(
        `[order:create] item product=${product.name} qty=${raw.quantity} unit_price=${unit_price}`,
      );

      items.push({
        product_id: product.id,
        quantity: raw.quantity,
        unit_price,
      });
    }

    if (items.length === 0) {
      this.logger.warn(
        '[order:create] No products resolved from DB — skipping',
      );
      return;
    }

    try {
      const order = await this.ordersService.create({
        client_id: clientId,
        user_id: botUserId,
        status: OrderStatus.PENDING_REVIEW,
        origin: OrderOrigin.WHATSAPP,
        items,
      });
      this.logger.log(
        `[order:create] ✅ Draft order created id=${order.id} items=${items.length}`,
      );
    } catch (err) {
      this.logger.error(
        `[order:create] ❌ Failed to create order: ${String(err)}`,
      );
    }
  }

  async sendTextMessage(to: string, text: string) {
    if (!to || !text) {
      throw new BadRequestException('Both to and text are required');
    }

    const normalizedTo = this.normalizePhone(to);
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
        to: normalizedTo,
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

  /**
   * Normalizes phone numbers for the WhatsApp Cloud API.
   * Mexico numbers arrive as 521XXXXXXXXXX but the API requires 52XXXXXXXXXX.
   */
  private normalizePhone(phone: string): string {
    const digits = phone.replace(/\D/g, '');
    if (digits.startsWith('521') && digits.length === 13) {
      return `52${digits.slice(3)}`;
    }
    return digits;
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
