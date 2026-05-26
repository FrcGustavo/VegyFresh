import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PortalAccessTokenGuard } from './guards/portal-access-token.guard';
import { CurrentPortalClient } from './decorators/current-portal-client.decorator';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';
import { PortalOrdersService } from './portal-orders.service';
import { PortalOrdersQueryDto } from './dto/portal-orders-query.dto';

@ApiTags('portal-orders')
@Controller('portal/orders')
@Public()
@UseGuards(PortalAccessTokenGuard)
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
  }),
)
export class PortalOrdersController {
  constructor(private readonly portalOrdersService: PortalOrdersService) {}

  @Get()
  @ApiOperation({ summary: 'List orders for authenticated portal client' })
  findAll(
    @CurrentPortalClient() user: AuthenticatedPortalClient,
    @Query() query: PortalOrdersQueryDto,
  ) {
    return this.portalOrdersService.findAll(user, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get portal order detail' })
  findOne(
    @CurrentPortalClient() user: AuthenticatedPortalClient,
    @Param('id') id: string,
  ) {
    return this.portalOrdersService.findOne(user, id);
  }
}
