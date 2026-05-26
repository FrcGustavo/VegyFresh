import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { Client } from './entities/client.entity';
import { PriceList } from '../catalog/price-lists/entities/price-list.entity';
import { PortalAccount } from '../portal/entities/portal-account.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Client, PriceList, PortalAccount])],
  controllers: [ClientsController],
  providers: [ClientsService],
  exports: [ClientsService],
})
export class ClientsModule {}
