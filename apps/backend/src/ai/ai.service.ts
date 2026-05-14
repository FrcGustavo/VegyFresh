import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface AiInterpretation {
  intent: string;
  confidence: number;
  extractedData: Record<string, unknown>;
  replyText: string;
  provider: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly configService: ConfigService) {}

  async interpretMessage(
    message: string,
    context: Record<string, unknown> = {},
  ): Promise<AiInterpretation> {
    const provider =
      this.configService.get<string>('AI_PROVIDER')?.toLowerCase() ??
      'heuristic';
    // console.log({ provider })
    try {
      if (provider === 'openai') {
        return await this.callOpenAi(message, context);
      }

      if (provider === 'gemini') {
        return await this.callGemini(message, context);
      }
    } catch (error) {
      this.logger.warn(
        `AI provider ${provider} failed, using heuristic fallback: ${String(error)}`,
      );
    }

    return this.buildHeuristicInterpretation(message, context, provider);
  }

  private async callOpenAi(
    message: string,
    context: Record<string, unknown>,
  ): Promise<AiInterpretation> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('AI_MODEL') ?? 'gpt-4o-mini';
    const baseUrl =
      this.configService.get<string>('OPENAI_BASE_URL') ??
      'https://api.openai.com/v1';

    if (!apiKey) {
      return this.buildHeuristicInterpretation(message, context, 'openai');
    }

    const prompt = `You are an order assistant for a produce business. The user message may be in Spanish.
The available products catalog is provided in the context as a JSON array with fields: id, name, sku.
Your job is to match what the user is requesting to products in the catalog by name or sku (fuzzy match is ok).

Respond with ONLY a JSON object with these keys:
- intent: "CREATE_ORDER" if the user wants to order products, otherwise "GENERAL_QUERY"
- confidence: number between 0 and 1
- extractedData: object with key "items" as array of { product_id, quantity } matched from catalog. Empty array if no match.
- replyText: a brief reply in Spanish confirming the order items found, or asking for clarification if nothing matched.`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: prompt },
          {
            role: 'user',
            content: `message=${message}\ncontext=${JSON.stringify(context)}`,
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    // console.log({ data });

    const content = data.choices?.[0]?.message?.content;
    // console.log({ content, message, context });
    return this.parseModelResponse(content, message, context, 'openai');
  }

  private async callGemini(
    message: string,
    context: Record<string, unknown>,
  ): Promise<AiInterpretation> {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    const model =
      this.configService.get<string>('AI_MODEL') ?? 'gemini-1.5-flash';
    const baseUrl =
      this.configService.get<string>('GEMINI_BASE_URL') ??
      'https://generativelanguage.googleapis.com/v1beta';

    if (!apiKey) {
      return this.buildHeuristicInterpretation(message, context, 'gemini');
    }

    const prompt = `You are an order assistant for a produce business. The user message may be in Spanish.
The available products catalog is provided in the context as a JSON array with fields: id, name, sku.
Match what the user requests to products by name or sku (fuzzy match is ok).

Respond with ONLY a raw JSON object (no markdown, no code fences) with these keys:
- intent: "CREATE_ORDER" if the user wants to order products, otherwise "GENERAL_QUERY"
- confidence: number between 0 and 1
- extractedData: object with key "items" as array of { product_id, quantity } matched from catalog. Empty array if no match.
- replyText: a brief reply in Spanish confirming the order items found, or asking for clarification if nothing matched.`;
    const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${prompt}\nmessage=${message}\ncontext=${JSON.stringify(context)}`,
              },
            ],
          },
        ],
      }),
    });

    const data = (await response.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const content = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();
    return this.parseModelResponse(content, message, context, 'gemini');
  }

  private parseModelResponse(
    content: string | undefined,
    message: string,
    context: Record<string, unknown>,
    provider: string,
  ): AiInterpretation {
    if (!content) {
      return this.buildHeuristicInterpretation(message, context, provider);
    }

    // Strip markdown code fences if the model wrapped its response in ```json ... ```
    const stripped = content
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/, '')
      .trim();

    try {
      const parsed = JSON.parse(stripped) as Partial<AiInterpretation>;
      return {
        intent: parsed.intent ?? 'GENERAL_QUERY',
        confidence:
          typeof parsed.confidence === 'number' ? parsed.confidence : 0.7,
        extractedData: parsed.extractedData ?? {},
        replyText:
          parsed.replyText ??
          'Gracias por tu mensaje. En breve te confirmamos detalles.',
        provider,
      };
    } catch {
      return {
        intent: 'GENERAL_QUERY',
        confidence: 0.65,
        extractedData: {},
        replyText: content,
        provider,
      };
    }
  }

  private buildHeuristicInterpretation(
    message: string,
    context: Record<string, unknown>,
    provider: string,
  ): AiInterpretation {
    const normalized = message.toLowerCase();
    const looksLikeOrder = /(pedido|orden|comprar|cotiza|precio|kilo|kg)/.test(
      normalized,
    );

    if (looksLikeOrder) {
      return {
        intent: 'CREATE_ORDER',
        confidence: 0.72,
        extractedData: { rawText: message, ...context },
        replyText:
          'Perfecto. Ya recibimos tu pedido y lo estamos procesando para confirmarte precios y disponibilidad.',
        provider,
      };
    }

    return {
      intent: 'GENERAL_QUERY',
      confidence: 0.6,
      extractedData: { rawText: message, ...context },
      replyText:
        'Gracias por escribirnos. Contanos qué productos necesitás y te ayudamos al instante.',
      provider,
    };
  }
}
