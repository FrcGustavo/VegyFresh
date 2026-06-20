import {
  Body,
  Controller,
  Get,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CreateRoleDto } from './dto/create-role.dto';
import { RolesService } from './roles.service';

@ApiTags('roles')
@ApiBearerAuth()
@Controller('roles')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }),
)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @Roles('owner', 'admin')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Get all available roles' })
  @ApiResponse({ status: 200, description: 'List of roles' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @Roles('owner')
  @Permissions('organization:manage')
  @ApiOperation({ summary: 'Create a role if it does not exist' })
  @ApiResponse({ status: 201, description: 'Role created or already present' })
  create(@Body() input: CreateRoleDto) {
    return this.rolesService.ensureRole(input.name, input.permissions);
  }
}
