import { Module } from '@nestjs/common';
import { ProductPricesService } from './product-prices.service';
import { ProductPricesController } from './product-prices.controller';

@Module({
  controllers: [ProductPricesController],
  providers: [ProductPricesService],
})
export class ProductPricesModule {}
