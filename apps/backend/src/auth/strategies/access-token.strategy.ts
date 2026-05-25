import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, Repository } from 'typeorm';
import { OrganizationUser } from '../../organizations/entities/organization-user.entity';
import { AuthSession } from '../entities/auth-session.entity';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { permissionsForRole } from '../constants/org-role-permissions';
import { resolveJwtSecret } from '../auth-security.config';

@Injectable()
export class AccessTokenStrategy extends PassportStrategy(
  Strategy,
  'jwt-access',
) {
  constructor(
    configService: ConfigService,
    @InjectRepository(AuthSession)
    private readonly authSessionsRepository: Repository<AuthSession>,
    @InjectRepository(OrganizationUser)
    private readonly organizationUsersRepository: Repository<OrganizationUser>,
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
      membership_id: payload.membership_id,
      revoked_at: IsNull(),
    });
    if (!session || session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    const membership = await this.organizationUsersRepository.findOneBy({
      id: payload.membership_id,
      user_id: payload.sub,
      organization_id: payload.org_id,
      is_active: true,
    });
    if (!membership) {
      throw new UnauthorizedException('Membership is not active');
    }

    return {
      ...payload,
      role: membership.role,
      permissions: permissionsForRole(membership.role),
    };
  }
}
