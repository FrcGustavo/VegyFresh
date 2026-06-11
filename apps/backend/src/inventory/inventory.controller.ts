import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentOrganization } from '../auth/decorators/current-organization.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';

@ApiTags('inventory')
@Controller()
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('inventory')
  @ApiBearerAuth()
  @Permissions('inventory:read')
  @ApiResponse({
    status: 200,
    description: 'Current inventory snapshot',
    schema: {
      example: {
        products: [{ productId: 'product_123', quantity: 100 }],
        updatedAt: '2024-01-15T10:30:00Z',
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
  @ApiOperation({ summary: 'Get current inventory snapshot' })
  findInventory(@CurrentOrganization() organizationId: string) {
    return this.inventoryService.findInventory(organizationId);
  }

  @Get('inventory/movements')
  @ApiBearerAuth()
  @Permissions('inventory:read')
  @ApiResponse({
    status: 200,
    description: 'Inventory movement history',
    schema: {
      example: {
        movements: [
          {
            id: 'movement_123',
            productId: 'product_123',
            quantity: 10,
            type: 'purchase',
          },
        ],
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
  @ApiOperation({ summary: 'Get inventory movement history' })
  findInventoryMovements(@CurrentOrganization() organizationId: string) {
    return this.inventoryService.findInventoryMovements(organizationId);
  }

  @Post('inventory/adjustments')
  @ApiBearerAuth()
  @Permissions('inventory:manage')
  @ApiResponse({
    status: 201,
    description: 'Inventory adjustment created',
    schema: {
      example: {
        id: 'adjustment_123',
        productId: 'product_123',
        quantity: -5,
        reason: 'Damage',
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
  @ApiOperation({ summary: 'Create manual inventory adjustment' })
  createAdjustment(
    @Body(new ValidationPipe({ transform: true }))
    createInventoryAdjustmentDto: CreateInventoryAdjustmentDto,
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.inventoryService.createAdjustment(
      createInventoryAdjustmentDto,
      organizationId,
      user.sub,
    );
  }
}
