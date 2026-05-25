import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import { AppModule } from './app.module';

type RawBodyRequest = IncomingMessage & { rawBody?: string };

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(
    json({
      verify: (req: RawBodyRequest, _res: ServerResponse, buffer: Buffer) => {
        req.rawBody = buffer.toString();
      },
    }),
  );
  app.enableCors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? '*',
    credentials: true,
  });

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('VegyFresh Backend API')
    .setDescription(
      'Backend API documentation for VegyFresh.\n\nAuthentication is JWT-based and tenant-aware: access tokens include org_id and membership_id claims. Protected endpoints are scoped to the authenticated tenant context.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication and session endpoints')
    .addTag('organizations', 'Organization management endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('roles', 'Role management endpoints')
    .addTag('clients', 'Client management endpoints')
    .addTag('suppliers', 'Supplier management endpoints')
    .addTag('products', 'Product catalog endpoints')
    .addTag('price-lists', 'Price list management endpoints')
    .addTag('product-prices', 'Product pricing endpoints')
    .addTag('orders', 'Order management endpoints')
    .addTag('whatsapp', 'WhatsApp webhook and messaging endpoints')
    .addTag('ai', 'AI interpretation endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(
    `Application is running on: http://localhost:${process.env.PORT ?? 3000}`,
  );
  console.log(
    `Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`,
  );
}

void bootstrap();
