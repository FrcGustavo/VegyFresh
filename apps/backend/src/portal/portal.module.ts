import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { OrderItem } from '../orders/entities/order-item.entity';
import { Product } from '../catalog/products/entities/product.entity';
import { ProductPrice } from '../catalog/product-prices/entities/product-price.entity';
import { User } from '../users/entities/user.entity';
import { PortalAuthSession } from './entities/portal-auth-session.entity';
import { PortalAccount } from './entities/portal-account.entity';
import { PortalAuthController } from './portal-auth.controller';
import { PortalOrdersController } from './portal-orders.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalOrdersService } from './portal-orders.service';
import { PortalAccessTokenStrategy } from './strategies/portal-access-token.strategy';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([
      Client,
      User,
      Order,
      OrderItem,
      Product,
      ProductPrice,
      PortalAccount,
      PortalAuthSession,
    ]),
  ],
  controllers: [PortalAuthController, PortalOrdersController],
  providers: [PortalAuthService, PortalOrdersService, PortalAccessTokenStrategy],
  exports: [PortalAuthService, PortalOrdersService],
})
export class PortalModule {}
