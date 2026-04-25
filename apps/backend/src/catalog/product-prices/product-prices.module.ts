import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductPricesService } from './product-prices.service';
import { ProductPricesController } from './product-prices.controller';
import { ProductPrice } from './entities/product-price.entity';
import { Product } from '../products/entities/product.entity';
import { PriceList } from '../price-lists/entities/price-list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ProductPrice, Product, PriceList])],
  controllers: [ProductPricesController],
  providers: [ProductPricesService],
  exports: [ProductPricesService],
})
export class ProductPricesModule {}
