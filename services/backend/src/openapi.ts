import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('VegyFresh Backend API')
    .setDescription(
      'Backend API documentation for VegyFresh.\n\nAuthentication is JWT-based and tenant-aware: access tokens include org_id, role, and permissions claims. Protected endpoints are scoped to the authenticated tenant context.',
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

  return SwaggerModule.createDocument(app, config);
}
