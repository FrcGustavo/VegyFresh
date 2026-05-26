import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Login customer portal client' })
  login(@Body() dto: PortalLoginDto) {
    return this.portalAuthService.login(dto);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh portal session tokens' })
  refresh(@Body() dto: PortalRefreshTokenDto) {
    return this.portalAuthService.refresh(dto);
  }

  @Get('me')
  @UseGuards(PortalAccessTokenGuard)
  @ApiOperation({ summary: 'Get authenticated portal client profile' })
  me(@CurrentPortalClient() user: AuthenticatedPortalClient) {
    return this.portalAuthService.me(user);
  }

  @Post('logout')
  @UseGuards(PortalAccessTokenGuard)
  @ApiOperation({ summary: 'Logout current portal session' })
  logout(@CurrentPortalClient() user: AuthenticatedPortalClient) {
    return this.portalAuthService.logout(user);
  }
}
