import { Module } from '@nestjs/common';
import { AiModule } from '../ai/ai.module';
import { ClientsModule } from '../clients/clients.module';
import { CatalogModule } from '../catalog/catalog.module';
import { OrdersModule } from '../orders/orders.module';
import { WhatsappService } from './whatsapp.service';
import { WhatsappController } from './whatsapp.controller';

@Module({
  imports: [AiModule, ClientsModule, CatalogModule, OrdersModule],
  controllers: [WhatsappController],
  providers: [WhatsappService],
})
export class WhatsappModule {}
