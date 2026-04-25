import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Product } from '../catalog/products/entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Client, User, Product]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
