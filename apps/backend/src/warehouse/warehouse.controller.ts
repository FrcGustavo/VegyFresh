import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentOrganization } from '../auth/decorators/current-organization.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { CreatePurchaseDto } from './dto/create-purchase.dto';
import { CreateInventoryAdjustmentDto } from './dto/create-inventory-adjustment.dto';

@ApiTags('warehouse')
@Controller()
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  @Get('purchases')
  @Permissions('warehouse:read')
  @ApiOperation({ summary: 'Get all supplier purchases' })
  findPurchases(@CurrentOrganization() organizationId: string) {
    return this.warehouseService.findPurchases(organizationId);
  }

  @Post('purchases')
  @Permissions('warehouse:manage')
  @ApiOperation({ summary: 'Create a supplier purchase and increase stock' })
  createPurchase(
    @Body(new ValidationPipe({ transform: true })) createPurchaseDto: CreatePurchaseDto,
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehouseService.createPurchase(
      createPurchaseDto,
      organizationId,
      user.sub,
    );
  }

  @Get('purchases/:id')
  @Permissions('warehouse:read')
  @ApiOperation({ summary: 'Get purchase details by id' })
  @ApiParam({ name: 'id', description: 'Purchase ID' })
  findPurchaseById(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.warehouseService.findPurchaseById(id, organizationId);
  }

  @Get('inventory')
  @Permissions('warehouse:read')
  @ApiOperation({ summary: 'Get current inventory snapshot' })
  findInventory(@CurrentOrganization() organizationId: string) {
    return this.warehouseService.findInventory(organizationId);
  }

  @Get('inventory/movements')
  @Permissions('warehouse:read')
  @ApiOperation({ summary: 'Get inventory movement history' })
  findInventoryMovements(@CurrentOrganization() organizationId: string) {
    return this.warehouseService.findInventoryMovements(organizationId);
  }

  @Post('inventory/adjustments')
  @Permissions('warehouse:manage')
  @ApiOperation({ summary: 'Create manual inventory adjustment' })
  createAdjustment(
    @Body(new ValidationPipe({ transform: true }))
    createInventoryAdjustmentDto: CreateInventoryAdjustmentDto,
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.warehouseService.createAdjustment(
      createInventoryAdjustmentDto,
      organizationId,
      user.sub,
    );
  }
}
