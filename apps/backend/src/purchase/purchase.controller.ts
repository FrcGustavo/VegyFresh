import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
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
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get all purchases' })
  findPurchases(@CurrentOrganization() organizationId: string) {
    return this.purchaseService.findPurchases(organizationId);
  }

  @Post()
  @Permissions('inventory:manage')
  @ApiOperation({ summary: 'Create a purchase and increase stock' })
  createPurchase(
    @Body(new ValidationPipe({ transform: true }))
    createPurchaseDto: CreatePurchaseDto,
    @CurrentOrganization() organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.purchaseService.createPurchase(
      createPurchaseDto,
      organizationId,
      user.sub,
    );
  }

  @Get(':id')
  @Permissions('inventory:read')
  @ApiOperation({ summary: 'Get purchase details by id' })
  @ApiParam({ name: 'id', description: 'Purchase ID' })
  findPurchaseById(
    @Param('id') id: string,
    @CurrentOrganization() organizationId: string,
  ) {
    return this.purchaseService.findPurchaseById(id, organizationId);
  }
}
