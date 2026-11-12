import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Client } from '../clients/entities/client.entity';
import { Order } from '../orders/entities/order.entity';
import { PortalAuthSession } from './entities/portal-auth-session.entity';
import { PortalAuthController } from './portal-auth.controller';
import { PortalOrdersController } from './portal-orders.controller';
import { PortalAuthService } from './portal-auth.service';
import { PortalOrdersService } from './portal-orders.service';
import { KeycloakPortalStrategy } from '../identity/strategies/keycloak.strategy';
import { IdentityModule } from '../identity/identity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Client, Order, PortalAuthSession]),
    IdentityModule,
  ],
  controllers: [PortalAuthController, PortalOrdersController],
  providers: [PortalAuthService, PortalOrdersService, KeycloakPortalStrategy],
  exports: [PortalAuthService, PortalOrdersService],
})
export class PortalModule {}
