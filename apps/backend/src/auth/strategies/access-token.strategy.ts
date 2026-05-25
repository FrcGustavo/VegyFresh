import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, Repository } from 'typeorm';
import { AuthSession } from '../entities/auth-session.entity';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { resolveJwtSecret } from '../auth-security.config';
import { User } from '../../users/entities/user.entity';
import { extractRolePermissions } from '../utils/role-permissions';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    configService: ConfigService,
    @InjectRepository(AuthSession)
    private readonly authSessionsRepository: Repository<AuthSession>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {
    const accessSecret = resolveJwtSecret(configService, 'JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(payload: AuthenticatedUser): Promise<AuthenticatedUser> {
    const sessionId = payload.session_id ?? payload.sid;
    if (!sessionId) {
      throw new UnauthorizedException('Token missing session identifier');
    }

    const session = await this.authSessionsRepository.findOneBy({
      id: sessionId,
      user_id: payload.sub,
      organization_id: payload.org_id,
      revoked_at: IsNull(),
    });
    if (!session || session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    const user = await this.usersRepository.findOne({
      where: {
        id: payload.sub,
        organization_id: payload.org_id,
      },
      relations: {
        role: true,
      },
    });
    if (!user || !user.role) {
      throw new UnauthorizedException('User is not active in organization');
    }

    return {
      ...payload,
      role: user.role.name,
      permissions: extractRolePermissions(user.role.permissions),
    };
  }
}
