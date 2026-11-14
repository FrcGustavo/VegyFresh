import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PortalAuthService } from './portal-auth.service';
import { PortalAccessTokenGuard } from './guards/portal-access-token.guard';
import { CurrentPortalClient } from './decorators/current-portal-client.decorator';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';

@ApiTags('portal-auth')
@Controller('portal/auth')
@Public()
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Get('me')
  @UseGuards(PortalAccessTokenGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Portal client profile',
    schema: {
      example: {
        client: {
          id: 'client_123',
          email: 'client@example.com',
          name: 'Client Name',
          portalEnabled: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Keycloak access token',
  })
  @ApiOperation({ summary: 'Get authenticated portal client profile' })
  me(@CurrentPortalClient() user: AuthenticatedPortalClient) {
    return this.portalAuthService.me(user);
  }
}
