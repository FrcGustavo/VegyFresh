import { Body, Controller, Get, Post, ValidationPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get current inventory snapshot' })
  findInventory(@CurrentOrganization() organizationId: string) {
    return this.inventoryService.findInventory(organizationId);
  }

  @Get('inventory/movements')
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get inventory movement history' })
  findInventoryMovements(@CurrentOrganization() organizationId: string) {
    return this.inventoryService.findInventoryMovements(organizationId);
  }

  @Post('inventory/adjustments')
  @Permissions('inventory:manage')
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
