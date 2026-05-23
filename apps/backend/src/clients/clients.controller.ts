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
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { UpdateClientDto } from './dto/update-client.dto';

@ApiTags('clients')
@Controller('clients')
export class ClientsController {
  constructor(private readonly clientsService: ClientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new client' })
  create(@Body() createClientDto: CreateClientDto) {
    return this.clientsService.create(createClientDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all clients' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by client name' })
  @ApiQuery({ name: 'order_by', required: false, description: 'Field to sort by' })
  @ApiQuery({ name: 'order', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 25)' })
  @ApiQuery({ name: 'offset', required: false, description: 'Pagination offset' })
  findAll(
    @Query('search') search?: string,
    @Query('order_by') orderBy?: string,
    @Query('order') order?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const parsedLimit = this.parseNumberQuery(limit, 'limit', 25);
    const parsedOffset = this.parseNumberQuery(offset, 'offset', 0);
    const normalizedOrder = order?.toUpperCase();

    if (normalizedOrder && normalizedOrder !== 'ASC' && normalizedOrder !== 'DESC') {
      throw new BadRequestException('order must be "asc" or "desc"');
    }

    return this.clientsService.findAll({
      search,
      orderBy,
      order: normalizedOrder as 'ASC' | 'DESC' | undefined,
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a client by ID' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  findOne(@Param('id') id: string) {
    return this.clientsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a client' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  update(@Param('id') id: string, @Body() updateClientDto: UpdateClientDto) {
    return this.clientsService.update(id, updateClientDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a client' })
  @ApiParam({ name: 'id', description: 'Client ID' })
  remove(@Param('id') id: string) {
    return this.clientsService.remove(id);
  }

  private parseNumberQuery(value: string | undefined, paramName: string, defaultValue: number) {
    if (value === undefined) {
      return defaultValue;
    }

    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new BadRequestException(`${paramName} must be a non-negative integer`);
    }

    return parsed;
  }
}
