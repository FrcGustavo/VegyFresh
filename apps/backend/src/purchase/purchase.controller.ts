import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentOrganization } from '../auth/decorators/current-organization.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { PurchaseService } from './purchase.service';

@ApiTags('purchase')
@Controller('purchases')
export class PurchaseController {
  constructor(private readonly purchaseService: PurchaseService) {}

  @Get()
  @ApiBearerAuth()
  @Permissions('inventory:read')
  @ApiResponse({
    status: 200,
    description: 'List of purchases',
    schema: {
      example: {
        data: [{ id: 'purchase_123', productId: 'product_123', quantity: 10 }],
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
  @ApiOperation({ summary: 'Get all purchases' })
  findAll(@CurrentOrganization() organizationId: string) {
    return this.purchaseService.findAll(organizationId);
  }

  @Post()
  @ApiBearerAuth()
  @Permissions('inventory:manage')
  @ApiResponse({
    status: 201,
    description: 'Purchase created and stock increased',
    schema: {
      example: {
        id: 'purchase_123',
        productId: 'product_123',
        quantity: 10,
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
  @ApiOperation({ summary: 'Create a purchase and increase stock' })
  create(
    @Body(new ValidationPipe({ transform: true }))
    createPurchaseDto: CreatePurchaseDto,
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseService.create(
      createPurchaseDto,
      organizationId,
      user.sub,
    );
  }

  @Get(':id')
  @ApiBearerAuth()
  @Permissions('inventory:read')
  @ApiResponse({
    status: 200,
    description: 'Purchase details',
    schema: {
      example: {
        id: 'purchase_123',
        productId: 'product_123',
        quantity: 10,
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
    description: 'Purchase not found',
  })
  @ApiOperation({ summary: 'Get purchase details by id' })
  @ApiParam({ name: 'id', description: 'Purchase ID' })
  find(@Param('id') id: string, @CurrentOrganization() organizationId: string) {
    return this.purchaseService.findOne(id, organizationId);
  }
}
