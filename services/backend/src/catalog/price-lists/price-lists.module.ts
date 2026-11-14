import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PriceListsService } from './price-lists.service';
import { PriceListsController } from './price-lists.controller';
import { PriceList } from './entities/price-list.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PriceList])],
  controllers: [PriceListsController],
  providers: [PriceListsService],
  exports: [PriceListsService],
})
export class PriceListsModule {}
