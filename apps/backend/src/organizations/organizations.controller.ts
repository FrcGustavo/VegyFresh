import {
  ValidationPipe,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UsePipes,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
// import { Roles } from '../auth/decorators/roles.decorator';
// import { Permissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';

@ApiTags('organizations')
@Controller('organizations')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
  }),
)
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}

  @Post()
  // @Roles('owner')
  // @Permissions('organization:manage')
  @ApiOperation({ summary: 'Create organization' })
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log('RUTA');
    return this.organizationsService.create(createOrganizationDto, user.sub);
  }

  @Get(':id')
  // @Roles('owner', 'admin')
  // @Permissions('organization:manage')
  @ApiOperation({ summary: 'Find organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    console.log({ id, user });
    return this.organizationsService.findOne(id, user.sub);
  }

  @Patch(':id')
  // @Roles('owner', 'admin')
  // @Permissions('organization:manage')
  @ApiOperation({ summary: 'Update organization' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  update(
    @Param('id') id: string,
    @Body() updateOrganizationDto: UpdateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.organizationsService.update(
      id,
      user.sub,
      updateOrganizationDto,
    );
  }
}
