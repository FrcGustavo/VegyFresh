import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IsNull, Repository } from 'typeorm';
import { Client } from '../../clients/entities/client.entity';
import { PortalAuthSession } from '../entities/portal-auth-session.entity';
import type { AuthenticatedPortalClient } from '../types/authenticated-portal-client.type';
import { resolveJwtSecret } from '../../auth/auth-security.config';

@Injectable()
export class PortalAccessTokenStrategy extends PassportStrategy(
  Strategy,
  'portal-jwt',
) {
  constructor(
    configService: ConfigService,
    @InjectRepository(PortalAuthSession)
    private readonly portalSessionsRepository: Repository<PortalAuthSession>,
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
  ) {
    const accessSecret =
      configService.get<string>('PORTAL_JWT_ACCESS_SECRET') ??
      configService.get<string>('config.portalJwtAccessSecret') ??
      resolveJwtSecret(configService, 'JWT_ACCESS_SECRET');
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  async validate(
    payload: AuthenticatedPortalClient,
  ): Promise<AuthenticatedPortalClient> {
    if (payload.type !== 'portal-client') {
      throw new UnauthorizedException('Invalid portal token type');
    }

    const sessionId = payload.session_id ?? payload.sid;
    if (!sessionId) {
      throw new UnauthorizedException('Token missing session identifier');
    }

    const session = await this.portalSessionsRepository.findOneBy({
      id: sessionId,
      client_id: payload.sub,
      organization_id: payload.organization_id,
      revoked_at: IsNull(),
    });
    if (!session || session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Session is invalid or expired');
    }

    const client = await this.clientsRepository.findOneBy({
      id: payload.sub,
      organization_id: payload.organization_id,
    });
    if (!client) {
      throw new UnauthorizedException('Client is not active in portal');
    }

    return payload;
  }
}
