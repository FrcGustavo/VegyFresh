import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { FindOrdersQueryDto } from './dto/find-orders-query.dto';
import { CurrentOrganization } from '../auth/decorators/current-organization.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @Permissions('orders:manage')
  @ApiOperation({ summary: 'Create a new order' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.create(createOrderDto, organizationId);
  }

  @Get()
  @Permissions('orders:read')
  @ApiOperation({ summary: 'Get all orders' })
  findAll(
    @Query() query: FindOrdersQueryDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.findAll(
      {
        created_filter: query.created_filter ?? 'all',
        created_from: query.created_from,
        created_to: query.created_to,
        order_by: query.order_by ?? 'created_at',
        order: query.order ?? 'desc',
        limit: query.limit ?? 25,
        offset: query.offset ?? 0,
      },
      organizationId,
    );
  }

  @Get(':id')
  @Permissions('orders:read')
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.findOne(id, organizationId);
  }

  @Patch(':id')
  @Permissions('orders:manage')
  @ApiOperation({ summary: 'Update an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  update(
    @Param('id') id: string,
    @Body() updateOrderDto: UpdateOrderDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.update(id, updateOrderDto, organizationId);
  }

  @Delete(':id')
  @Permissions('orders:manage')
  @ApiOperation({ summary: 'Delete an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.remove(id, organizationId);
  }
}
