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
import { PriceListsService } from './price-lists.service';
import { CreatePriceListDto } from './dto/create-price-list.dto';
import { UpdatePriceListDto } from './dto/update-price-list.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import { Permissions } from '../../auth/decorators/permissions.decorator';

@ApiTags('price-lists')
@ApiBearerAuth()
@Controller('price-lists')
export class PriceListsController {
  constructor(private readonly priceListsService: PriceListsService) {}

  @Post()
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Create a new price list' })
  create(
    @Body() createPriceListDto: CreatePriceListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceListsService.create(createPriceListDto, user.org_id);
  }

  @Get()
  @Permissions('catalog:read')
  @ApiOperation({ summary: 'Get all price lists' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by price list name',
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

    return this.priceListsService.findAll(
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
  @ApiOperation({ summary: 'Get a price list by ID' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.priceListsService.findOne(id, user.org_id);
  }

  @Patch(':id')
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Update a price list' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  update(
    @Param('id') id: string,
    @Body() updatePriceListDto: UpdatePriceListDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.priceListsService.update(id, updatePriceListDto, user.org_id);
  }

  @Delete(':id')
  @Permissions('catalog:manage')
  @ApiOperation({ summary: 'Delete a price list' })
  @ApiParam({ name: 'id', description: 'Price list ID' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.priceListsService.remove(id, user.org_id);
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
