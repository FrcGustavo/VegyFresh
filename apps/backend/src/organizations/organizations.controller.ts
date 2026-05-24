import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  @Roles('owner', 'admin')
  @Permissions('organization:manage')
  @ApiOperation({ summary: 'Create organization' })
  create(@Body() createOrganizationDto: CreateOrganizationDto) {
    return this.organizationsService.create(createOrganizationDto);
  }

  @Get()
  @Roles('owner', 'admin')
  @Permissions('organization:manage')
  @ApiOperation({ summary: 'List organizations' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.organizationsService.findAll(user.sub);
  }

  @Get(':id')
  @Roles('owner', 'admin')
  @Permissions('organization:manage')
  @ApiOperation({ summary: 'Find organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  findOne(@Param('id') id: string) {
    return this.organizationsService.findOne(id);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  @Permissions('organization:manage')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
  ) {
    return this.organizationsService.update(id, updateOrganizationDto);
  }

  @Delete(':id')
  @Roles('owner')
  @Permissions('organization:manage')
  @ApiOperation({ summary: 'Delete organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  remove(@Param('id') id: string) {
    return this.organizationsService.remove(id);
  }
}
