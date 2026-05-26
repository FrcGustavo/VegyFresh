import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './clients/clients.module';
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { OrdersModule } from './orders/orders.module';
import { CatalogModule } from './catalog/catalog.module';
import { AiModule } from './ai/ai.module';
import { WhatsappModule } from './whatsapp/whatsapp.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AuthModule } from './auth/auth.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchaseModule } from './purchase/purchase.module';
import { PortalModule } from './portal/portal.module';
import config from './config';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
      load: [config],
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      inject: [config.KEY],
      useFactory: (configService: ConfigType<typeof config>) => ({
        type: 'postgres',
        host: configService.postgres.host,
        port: configService.postgres.port,
        username: configService.postgres.user,
        password: configService.postgres.password,
        database: configService.postgres.dbName,
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    ClientsModule,
    UsersModule,
    RolesModule,
    SuppliersModule,
    OrdersModule,
    CatalogModule,
    OrganizationsModule,
    AuthModule,
    InventoryModule,
    PurchaseModule,
    PortalModule,
    AiModule,
    WhatsappModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
