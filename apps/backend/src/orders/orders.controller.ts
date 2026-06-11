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
import { ApiTags, ApiOperation, ApiParam, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
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
  @ApiBearerAuth()
  @Permissions('orders:manage')
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    schema: {
      example: {
        id: 'order_123',
        clientId: 'client_123',
        total: 100.00,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['clientId is required'],
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
  @ApiOperation({ summary: 'Create a new order' })
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.create(createOrderDto, organizationId);
  }

  @Get()
  @ApiBearerAuth()
  @Permissions('orders:read')
  @ApiResponse({
    status: 200,
    description: 'List of orders',
    schema: {
      example: {
        data: [{ id: 'order_123', clientId: 'client_123', total: 100.00 }],
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
  @ApiBearerAuth()
  @Permissions('orders:read')
  @ApiResponse({
    status: 200,
    description: 'Order found',
    schema: {
      example: {
        id: 'order_123',
        clientId: 'client_123',
        total: 100.00,
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
    description: 'Order not found',
  })
  @ApiOperation({ summary: 'Get an order by ID' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  findOne(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.findOne(id, organizationId);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @Permissions('orders:manage')
  @ApiResponse({
    status: 200,
    description: 'Order updated successfully',
    schema: {
      example: {
        id: 'order_123',
        clientId: 'client_123',
        total: 150.00,
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
    description: 'Order not found',
  })
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
  @ApiBearerAuth()
  @Permissions('orders:manage')
  @ApiResponse({
    status: 200,
    description: 'Order deleted successfully',
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
    description: 'Order not found',
  })
  @ApiOperation({ summary: 'Delete an order' })
  @ApiParam({ name: 'id', description: 'Order ID' })
  remove(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.ordersService.remove(id, organizationId);
  }
}
