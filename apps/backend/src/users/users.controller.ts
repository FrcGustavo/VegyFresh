import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user.type';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles('owner', 'admin')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Create a new user' })
  create(
    @Body() createUserDto: CreateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.create(createUserDto, user.org_id);
  }

  @Get()
  @Roles('owner', 'admin')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Get all users' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search by user name',
  })
  @ApiQuery({
    name: 'order_by',
    required: false,
    description: 'Field to sort by',
  })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({
    name: 'limit',
    required: false,
    description: 'Items per page (default: 25)',
  })
  @ApiQuery({
    name: 'offset',
    required: false,
    description: 'Pagination offset',
  })
  findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
    @Query('order_by') orderBy?: string,
    @Query('order') order?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = this.parseNumberQuery(limit, 'limit', 25);
    const parsedOffset = this.parseNumberQuery(offset, 'offset', 0);
    const normalizedOrder = order?.toUpperCase();

    if (
      normalizedOrder &&
      normalizedOrder !== 'ASC' &&
      normalizedOrder !== 'DESC'
    ) {
      throw new BadRequestException('order must be "asc" or "desc"');
    }

    return this.usersService.findAll(
      {
        search,
        orderBy,
        order: normalizedOrder as 'ASC' | 'DESC' | undefined,
        limit: parsedLimit,
        offset: parsedOffset,
      },
      user.org_id,
    );
  }

  @Get(':id')
  @Roles('owner', 'admin')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({ name: 'id', description: 'User ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findOne(id, user.org_id);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Update a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.usersService.update(id, updateUserDto, user.org_id);
  }

  @Delete(':id')
  @Roles('owner')
  @Permissions('users:manage')
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User ID' })
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.usersService.remove(id, user.org_id);
  }

  private parseNumberQuery(
    value: string | undefined,
    paramName: string,
    defaultValue: number,
  ) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(
        `${paramName} must be a non-negative integer`,
      );
    }

    return parsed;
  }
}
