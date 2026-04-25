import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { ClientsModule } from './clients/clients.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { PriceListsModule } from './price-lists/price-lists.module';
import { ProductPricesModule } from './product-prices/product-prices.module';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    ProductsModule,
    ClientsModule,
    UsersModule,
    RolesModule,
    SuppliersModule,
    PriceListsModule,
    ProductPricesModule,
    OrdersModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
