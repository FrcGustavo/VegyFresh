import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { PortalAuthSession } from './entities/portal-auth-session.entity';
import { PortalAuthController } from './portal-auth.controller';
import { PortalOrdersController } from './portal-orders.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalOrdersService } from './portal-orders.service';
import { PortalAccessTokenStrategy } from './strategies/portal-access-token.strategy';

@Module({
  imports: [
    JwtModule.register({}),
    TypeOrmModule.forFeature([Client, Order, PortalAuthSession]),
  ],
  controllers: [PortalAuthController, PortalOrdersController],
  providers: [
    PortalAuthService,
    PortalOrdersService,
    PortalAccessTokenStrategy,
  ],
  exports: [PortalAuthService, PortalOrdersService],
})
export class PortalModule {}
