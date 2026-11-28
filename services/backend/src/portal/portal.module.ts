import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { PortalAuthController } from './portal-auth.controller';
import { PortalOrdersController } from './portal-orders.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalOrdersService } from './portal-orders.service';
import { OidcPortalStrategy } from '../identity/strategies/oidc.strategy';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [TypeOrmModule.forFeature([Client, Order]), IdentityModule],
  controllers: [PortalAuthController, PortalOrdersController],
  providers: [PortalAuthService, PortalOrdersService, OidcPortalStrategy],
  exports: [PortalAuthService, PortalOrdersService],
})
export class PortalModule {}
