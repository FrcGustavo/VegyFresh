import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';

@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  create(@Body() createPriceListDto: CreatePriceListDto) {
    return this.priceListsService.create(createPriceListDto);
  }

  @Get()
  findAll() {
    return this.priceListsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.priceListsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePriceListDto: UpdatePriceListDto) {
    return this.priceListsService.update(+id, updatePriceListDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.priceListsService.remove(+id);
  }
}
