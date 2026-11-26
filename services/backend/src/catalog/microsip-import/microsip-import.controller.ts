import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Headers,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiHeader,
  ApiOkResponse,
  ApiOperation,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { isUUID } from 'class-validator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import type { AuthenticatedUser } from '../../auth/types/authenticated-user.type';
import {
  MicrosipCatalogImportDto,
  MicrosipCatalogImportResultDto,
} from './dto/microsip-import.dto';
import { MicrosipImportService } from './microsip-import.service';

@ApiTags('microsip-import')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiForbiddenResponse()
@ApiBadRequestResponse()
@ApiConflictResponse()
@ApiPayloadTooLargeResponse()
@ApiOkResponse({ type: MicrosipCatalogImportResultDto })
@Permissions('catalog:manage')
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: () =>
      new BadRequestException('Invalid Microsip catalog payload'),
  }),
)
@Controller('catalog/microsip-import')
export class MicrosipImportController {
  constructor(private readonly service: MicrosipImportService) {}

  @Post('preview')
  @HttpCode(200)
  @ApiOperation({ summary: 'Preview a Microsip catalog import' })
  preview(
    @Body() payload: MicrosipCatalogImportDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.run('preview', payload, user.org_id);
  }

  @Post('apply')
  @HttpCode(200)
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    schema: { type: 'string', format: 'uuid' },
  })
  @ApiOperation({ summary: 'Apply a Microsip catalog import' })
  apply(
    @Body() payload: MicrosipCatalogImportDto,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
  ) {
    if (!idempotencyKey || !isUUID(idempotencyKey)) {
      throw new BadRequestException('Idempotency-Key must be a UUID');
    }
    return this.service.run('apply', payload, user.org_id, idempotencyKey);
  }
}
