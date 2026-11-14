import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { ProductPricesService } from './product-prices.service';
import { CreateProductPriceDto } from './dto/create-product-price.dto';
import { UpdateProductPriceDto } from './dto/update-product-price.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('product-prices')
@Controller('product-prices')
export class ProductPricesController {
  constructor(private readonly productPricesService: ProductPricesService) {}

  @Post()
  @ApiBearerAuth()
  @Permissions('catalog:manage')
  @ApiResponse({
    status: 201,
    description: 'Product price created successfully',
    schema: {
      example: {
        id: 'prodprice_123',
        productId: 'product_123',
        price: 5.99,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['productId is required'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiOperation({ summary: 'Create a new product price' })
  create(
    @Body() createProductPriceDto: CreateProductPriceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productPricesService.create(createProductPriceDto, user.org_id);
  }

  @Get()
  @ApiBearerAuth()
  @Permissions('catalog:read')
  @ApiResponse({
    status: 200,
    description: 'List of product prices',
    schema: {
      example: {
        data: [{ id: 'prodprice_123', productId: 'product_123', price: 5.99 }],
        total: 1,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiOperation({ summary: 'Get all product prices' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.productPricesService.findAll(user.org_id);
  }

  @Get(':id')
  @ApiBearerAuth()
  @Permissions('catalog:read')
  @ApiResponse({
    status: 200,
    description: 'Product price found',
    schema: {
      example: {
        id: 'prodprice_123',
        productId: 'product_123',
        price: 5.99,
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Product price not found',
  })
  @ApiOperation({ summary: 'Get a product price by ID' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productPricesService.findOne(id, user.org_id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Permissions('catalog:manage')
  @ApiResponse({
    status: 200,
    description: 'Product price updated successfully',
    schema: {
      example: {
        id: 'prodprice_123',
        productId: 'product_123',
        price: 6.99,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['field must be a number'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Product price not found',
  })
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
  @ApiBearerAuth()
  @Permissions('catalog:manage')
  @ApiResponse({
    status: 200,
    description: 'Product price deleted successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Product price not found',
  })
  @ApiOperation({ summary: 'Delete a product price' })
  @ApiParam({ name: 'id', description: 'Product price ID' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productPricesService.remove(id, user.org_id);
  }
}
