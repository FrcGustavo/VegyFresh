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
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';

@ApiTags('product-prices')
@Controller('product-prices')
export class ProductPricesController {
  constructor(private readonly productPricesService: ProductPricesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product price' })
  create(
    @Body() createProductPriceDto: CreateProductPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productPricesService.create(createProductPriceDto, user.org_id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all product prices' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.productPricesService.findAll(user.org_id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a product price by ID' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productPricesService.findOne(id, user.org_id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a product price' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  update(
    @Param('id') id: string,
    @Body() updateProductPriceDto: UpdateProductPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productPricesService.update(
      id,
      updateProductPriceDto,
      user.org_id,
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product price' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productPricesService.remove(id, user.org_id);
  }
}
