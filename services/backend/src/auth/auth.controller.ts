import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AccessTokenGuard } from './guards/access-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Authenticated user context' })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid Keycloak access token',
  })
  @ApiOperation({
    summary: 'Get current user context',
    description:
      'Returns the linked local user, organization, role, and permissions.',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
