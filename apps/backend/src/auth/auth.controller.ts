import {
  Body,
  Controller,
  Get,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthenticatedUser } from './types/authenticated-user.type';

@ApiTags('auth')
@Controller('auth')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    forbidUnknownValues: true,
    transform: true,
    stopAtFirstError: true,
  }),
)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('signup')
  @Public()
  @ApiOperation({
    summary: 'Signup user and create organization',
    description:
      'Creates a user, a new tenant organization, and an owner membership bound to that tenant.',
  })
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'If organization_id is omitted, first active membership is used. Returned JWTs include org_id and membership_id for tenant scoping.',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshTokenGuard)
  @ApiOperation({
    summary: 'Refresh access and refresh token pair',
    description:
      'Requires refresh token in body. Session must be active and tied to the same tenant membership.',
  })
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.refreshToken(user, refreshTokenDto.refresh_token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get current authenticated user context',
    description:
      'Returns user profile plus tenant (organization) and membership context from the access token.',
  })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke current session',
    description:
      'Revokes only the current tenant-bound session (by session_id).',
  })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }

  @Post('logout-all')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Revoke all sessions for current user/org',
    description:
      'Revokes every active session for the current user within the current tenant organization.',
  })
  logoutAll(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logoutAll(user);
  }
}
