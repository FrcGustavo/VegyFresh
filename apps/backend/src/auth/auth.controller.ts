import {
  Body,
  Controller,
  Post,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
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
  @ApiResponse({
    status: 201,
    description: 'User account created',
    schema: {
      example: {
        id: 'user_123',
        email: 'user@example.com',
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
  @ApiOperation({
    summary: 'Signup user',
    description:
      'Creates a user account and leaves organization setup for later.',
  })
  signup(@Body() signupDto: SignupDto) {
    return this.authService.signup(signupDto);
  }

  @Post('login')
  @Public()
  @ApiResponse({
    status: 200,
    description: 'Login successful',
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
  @ApiOperation({
    summary: 'Login with email and password',
    description:
      'Returns JWTs that include org_id and role context from the user record.',
  })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  @Public()
  @UseGuards(RefreshTokenGuard)
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
  @ApiOperation({
    summary: 'Refresh access and refresh token pair',
    description:
      'Requires refresh token in body. Session must be active and tied to the same tenant organization.',
  })
  refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.authService.refreshToken(user, refreshTokenDto.refresh_token);
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'Session revoked successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - missing or invalid token',
  })
  @ApiOperation({
    summary: 'Revoke current session',
    description:
      'Revokes only the current tenant-bound session (by session_id).',
  })
  logout(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.logout(user);
  }
}
