import { Module } from '@nestjs/common';
import { ProductsModule } from './products/products.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { ProductPricesModule } from './product-prices/product-prices.module';
import { FoliosModule } from 'src/folios/folios.module';

@Module({
  imports: [
    ProductsModule,
    PriceListsModule,
    ProductPricesModule,
    FoliosModule,
  ],
  exports: [ProductsModule, PriceListsModule, ProductPricesModule],
})
export class CatalogModule {}
