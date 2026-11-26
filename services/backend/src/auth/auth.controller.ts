import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Req,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthGuard } from '@nestjs/passport';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { IdentityService } from '../identity/identity.service';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import {
  AccessTokenGuard,
  UNLINKED_IDENTITY_NOT_FOUND,
} from './guards/access-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user.type';

type ProvisionProfile = {
  issuer?: unknown;
  subject?: unknown;
  email?: unknown;
  emailVerified?: unknown;
  name?: unknown;
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly identity: IdentityService,
    private readonly config: ConfigService,
  ) {}

  @Get('me')
  @SetMetadata(UNLINKED_IDENTITY_NOT_FOUND, true)
  @UseGuards(AccessTokenGuard)
  @ApiBearerAuth()
  @ApiResponse({ status: 200, description: 'Authenticated user context' })
  @ApiResponse({
    status: 401,
    description: 'Missing or invalid OIDC user access token',
  })
  @ApiResponse({
    status: 404,
    description: 'Valid token without a linked admin identity',
  })
  @ApiOperation({
    summary: 'Get current user context',
    description:
      'Returns the linked local user, organization, role, and permissions.',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Post('provision-admin')
  @Public()
  @UseGuards(AuthGuard('oidc-provisioning'))
  @ApiExcludeEndpoint()
  async provisionAdmin(
    @Req() request: Request,
    @Body() profile: ProvisionProfile,
    @Headers('x-provisioning-secret') secret?: string,
  ) {
    const configured =
      this.config.get<string>('OIDC_PROVISIONING_SECRET') ?? '';
    const expected = Buffer.from(configured);
    const received = Buffer.from(typeof secret === 'string' ? secret : '');
    if (
      !expected.length ||
      expected.length !== received.length ||
      !timingSafeEqual(expected, received)
    )
      throw new UnauthorizedException('Invalid provisioning credentials');
    const principal = request.user as { issuer: string; subject: string };
    if (
      !profile ||
      profile.issuer !== principal.issuer ||
      profile.subject !== principal.subject
    )
      throw new UnauthorizedException('Identity mismatch');
    return this.identity.resolveAdminUser(principal.issuer, principal.subject, {
      email: profile.email,
      emailVerified: profile.emailVerified,
      name: profile.name,
    });
  }
}
