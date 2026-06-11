import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { PortalAuthService } from './portal-auth.service';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalRefreshTokenDto } from './dto/portal-refresh-token.dto';
import { PortalAccessTokenGuard } from './guards/portal-access-token.guard';
import { CurrentPortalClient } from './decorators/current-portal-client.decorator';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';

@ApiTags('portal-auth')
@Controller('portal/auth')
@Public()
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
  }),
)
export class PortalAuthController {
  constructor(private readonly portalAuthService: PortalAuthService) {}

  @Post('login')
  @ApiResponse({
    status: 200,
    description: 'Portal login successful',
    schema: {
      example: {
        access_token: 'eyJhbGci...',
        refresh_token: 'eyJhbGci...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['email is required'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
  })
  @ApiOperation({ summary: 'Login customer portal client' })
  login(@Body() dto: PortalLoginDto) {
    return this.portalAuthService.login(dto);
  }

  @Post('refresh')
  @ApiResponse({
    status: 200,
    description: 'Token refresh successful',
    schema: {
      example: {
        access_token: 'eyJhbGci...',
        refresh_token: 'eyJhbGci...',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error',
    schema: {
      example: {
        statusCode: 400,
        message: ['refresh_token is required'],
        error: 'Bad Request',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  @ApiOperation({ summary: 'Refresh portal session tokens' })
  refresh(@Body() dto: PortalRefreshTokenDto) {
    return this.portalAuthService.refresh(dto);
  }

  @Get('me')
  @UseGuards(PortalAccessTokenGuard)
  @ApiResponse({
    status: 200,
    description: 'Portal client profile',
    schema: {
      example: {
        id: 'client_123',
        email: 'client@example.com',
        name: 'Client Name',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiOperation({ summary: 'Get authenticated portal client profile' })
  me(@CurrentPortalClient() user: AuthenticatedPortalClient) {
    return this.portalAuthService.me(user);
  }

  @Post('logout')
  @UseGuards(PortalAccessTokenGuard)
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Portal session revoked successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiOperation({ summary: 'Logout current portal session' })
  logout(@CurrentPortalClient() user: AuthenticatedPortalClient) {
    return this.portalAuthService.logout(user);
  }
}
