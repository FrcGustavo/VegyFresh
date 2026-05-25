import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Create a new product' })
  create(
    @Body() createProductDto: CreateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.create(createProductDto, user.org_id);
  }

  @Get()
  @Permissions('catalog:read')
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by product name',
  })
  @ApiQuery({
    name: 'order_by',
    required: false,
    description: 'Field to sort by',
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 25)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Pagination offset',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('serach') misspelledSearch?: string,
    @Query('order_by') orderBy?: string,
    @Query('field') fieldAlias?: string,
    @Query('filed') filedAlias?: string,
    @Query('order') order?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = this.parseNumberQuery(limit, 'limit', 25);
    const parsedOffset = this.parseNumberQuery(offset, 'offset', 0);
    const normalizedOrder = order?.toUpperCase();

    if (
      normalizedOrder &&
      normalizedOrder !== 'ASC' &&
      normalizedOrder !== 'DESC'
    ) {
      throw new BadRequestException('order must be "asc" or "desc"');
    }

    return this.productsService.findAll(
      {
        search: search ?? misspelledSearch,
        orderBy: orderBy ?? fieldAlias ?? filedAlias,
        order: normalizedOrder as 'ASC' | 'DESC' | undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      },
      user.org_id,
    );
  }

  @Get(':id')
  @Permissions('catalog:read')
  @ApiOperation({ summary: 'Get a product by ID' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.findOne(id, user.org_id);
  }

  @Patch(':id')
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  update(
    @Param('id') id: string,
    @Body() updateProductDto: UpdateProductDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.productsService.update(id, updateProductDto, user.org_id);
  }

  @Delete(':id')
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Delete a product' })
  @ApiParam({ name: 'id', description: 'Product ID' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.productsService.remove(id, user.org_id);
  }

  private parseNumberQuery(
    value: string | undefined,
    paramName: string,
    defaultValue: number,
  ) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(
        `${paramName} must be a non-negative integer`,
      );
    }

    return parsed;
  }
}
