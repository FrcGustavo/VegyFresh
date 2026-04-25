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
import { ProductPricesService } from './product-prices.service';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';

@ApiTags('product-prices')
@Controller('product-prices')
export class ProductPricesController {
  constructor(private readonly productPricesService: ProductPricesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product price' })
  create(@Body() createProductPriceDto: CreateProductPriceDto) {
    return this.productPricesService.create(createProductPriceDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all product prices' })
  findAll() {
    return this.productPricesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product price by ID' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  findOne(@Param('id') id: string) {
    return this.productPricesService.findOne(+id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product price' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  update(
    @Param('id') id: string,
    @Body() updateProductPriceDto: UpdateProductPriceDto,
  ) {
    return this.productPricesService.update(+id, updateProductPriceDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product price' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  remove(@Param('id') id: string) {
    return this.productPricesService.remove(+id);
  }
}
