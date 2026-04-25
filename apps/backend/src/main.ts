import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('VegyFresh Backend API')
    .setDescription('Backend API documentation for VegyFresh e-commerce platform')
    .setVersion('1.0')
    .addTag('users', 'User management endpoints')
    .addTag('roles', 'Role management endpoints')
    .addTag('clients', 'Client management endpoints')
    .addTag('suppliers', 'Supplier management endpoints')
    .addTag('products', 'Product catalog endpoints')
    .addTag('price-lists', 'Price list management endpoints')
    .addTag('product-prices', 'Product pricing endpoints')
    .addTag('orders', 'Order management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger documentation available at: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}

void bootstrap();
