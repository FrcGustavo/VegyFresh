import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';

@ApiTags('price-lists')
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new price list' })
  create(@Body() createPriceListDto: CreatePriceListDto) {
    return this.priceListsService.create(createPriceListDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all price lists' })
  findAll() {
    return this.priceListsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a price list by ID' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  findOne(@Param('id') id: string) {
    return this.priceListsService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a price list' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  update(
    @Param('id') id: string,
    @Body() updatePriceListDto: UpdatePriceListDto,
  ) {
    return this.priceListsService.update(+id, updatePriceListDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a price list' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  remove(@Param('id') id: string) {
    return this.priceListsService.remove(+id);
  }
}
