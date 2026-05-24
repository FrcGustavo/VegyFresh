import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { resolveJwtSecret } from '../auth-security.config';

const extractRefreshToken = ExtractJwt.fromExtractors([
  (request: { body?: { refresh_token?: string } } | undefined) =>
    request?.body?.refresh_token ?? null,
]);

@Injectable()
export class RefreshTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(configService: ConfigService) {
    const refreshSecret = resolveJwtSecret(configService, 'JWT_REFRESH_SECRET');
    super({
      jwtFromRequest: extractRefreshToken,
      ignoreExpiration: false,
      secretOrKey: refreshSecret,
      passReqToCallback: false,
    });
  }

  validate(payload: AuthenticatedUser): AuthenticatedUser {
    return payload;
  }
}
