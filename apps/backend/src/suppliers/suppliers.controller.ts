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
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('suppliers')
@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post()
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Create a new supplier' })
  create(
    @Body() createSupplierDto: CreateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.create(createSupplierDto, user.org_id);
  }

  @Get()
  @Permissions('catalog:read')
  @ApiOperation({ summary: 'Get all suppliers' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by supplier name',
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
    @Query('order_by') orderBy?: string,
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

    return this.suppliersService.findAll(
      {
        search,
        orderBy,
        order: normalizedOrder as 'ASC' | 'DESC' | undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      },
      user.org_id,
    );
  }

  @Get(':id')
  @Permissions('catalog:read')
  @ApiOperation({ summary: 'Get a supplier by ID' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.suppliersService.findOne(id, user.org_id);
  }

  @Patch(':id')
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Update a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  update(
    @Param('id') id: string,
    @Body() updateSupplierDto: UpdateSupplierDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.suppliersService.update(id, updateSupplierDto, user.org_id);
  }

  @Delete(':id')
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Delete a supplier' })
  @ApiParam({ name: 'id', description: 'Supplier ID' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.suppliersService.remove(id, user.org_id);
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
