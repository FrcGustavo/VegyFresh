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
import { ApiOperation, ApiParam, ApiTags, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
    schema: {
      example: {
        id: 'org_123',
        name: 'Acme Corp',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['name is required', 'name must be a string'],
        error: 'Bad Request',
      },
    },
  })
  @ApiOperation({ summary: 'Create organization' })
  create(
    @Body() createOrganizationDto: CreateOrganizationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    console.log('RUTA');
    return this.organizationsService.create(createOrganizationDto, user.sub);
  }

  @Get(':id')
  @ApiResponse({
    status: 200,
    description: 'Organization found',
    schema: {
      example: {
        id: 'org_123',
        name: 'Acme Corp',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
  @ApiOperation({ summary: 'Find organization by ID' })
  @ApiParam({ name: 'id', description: 'Organization ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    console.log({ id, user });
    return this.organizationsService.findOne(id, user.sub);
  }

  @Patch(':id')
  @ApiResponse({
    status: 200,
    description: 'Organization updated successfully',
    schema: {
      example: {
        id: 'org_123',
        name: 'Acme Corp Updated',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['field must be a string'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Organization not found',
  })
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
