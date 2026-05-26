import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { IsNull, Repository } from 'typeorm';
import { createHash, randomUUID } from 'node:crypto';
import * as bcrypt from 'bcrypt';
import { Client } from '../clients/entities/client.entity';
import { PortalAuthSession } from './entities/portal-auth-session.entity';
import { PortalAccount } from './entities/portal-account.entity';
import type { AuthenticatedPortalClient } from './types/authenticated-portal-client.type';
import { PortalLoginDto } from './dto/portal-login.dto';
import { PortalSetupPasswordDto } from './dto/portal-setup-password.dto';
import { PortalRefreshTokenDto } from './dto/portal-refresh-token.dto';
import {
  DEFAULT_ACCESS_TOKEN_TTL,
  DEFAULT_BCRYPT_SALT_ROUNDS,
  DEFAULT_REFRESH_TOKEN_TTL,
  parseDurationToMs,
  resolveBcryptSaltRounds,
  resolveJwtSecret,
} from '../auth/auth-security.config';

type PortalTokens = {
  access_token: string;
  refresh_token: string;
};

@Injectable()
export class PortalAuthService {
  private readonly bcryptSaltRounds: number;

  constructor(
    @InjectRepository(Client)
    private readonly clientsRepository: Repository<Client>,
    @InjectRepository(PortalAccount)
    private readonly portalAccountsRepository: Repository<PortalAccount>,
    @InjectRepository(PortalAuthSession)
    private readonly portalSessionsRepository: Repository<PortalAuthSession>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds =
      resolveBcryptSaltRounds(configService) ?? DEFAULT_BCRYPT_SALT_ROUNDS;
  }

  async login(dto: PortalLoginDto) {
    const client = await this.clientsRepository.findOne({
      where: { email: dto.email.trim().toLowerCase() },
    });
    const portalAccount = client
      ? await this.portalAccountsRepository.findOneBy({ client_id: client.id })
      : null;
    if (!client || !portalAccount?.password_hash) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      portalAccount.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    portalAccount.last_portal_login_at = new Date();
    await this.portalAccountsRepository.save(portalAccount);
    const tokens = await this.generateTokens(client);

    return {
      client: this.buildClientProfile(client),
      ...tokens,
    };
  }

  async setupPassword(dto: PortalSetupPasswordDto) {
    const hashedToken = this.hashSetupToken(dto.token);
    const portalAccount = await this.portalAccountsRepository.findOne({
      where: { password_setup_token_hash: hashedToken },
      relations: { client: true },
    });
    if (!portalAccount?.client) {
      throw new UnauthorizedException('Invalid or expired setup link');
    }

    if (
      !portalAccount.password_setup_expires_at ||
      portalAccount.password_setup_expires_at.getTime() <= Date.now()
    ) {
      throw new UnauthorizedException('Invalid or expired setup link');
    }

    portalAccount.password_hash = await bcrypt.hash(
      dto.password,
      this.bcryptSaltRounds,
    );
    portalAccount.password_setup_token_hash = null;
    portalAccount.password_setup_expires_at = null;
    portalAccount.last_portal_login_at = new Date();
    await this.portalAccountsRepository.save(portalAccount);

    const tokens = await this.generateTokens(portalAccount.client);
    return {
      client: this.buildClientProfile(portalAccount.client),
      ...tokens,
    };
  }

  async refresh(dto: PortalRefreshTokenDto) {
    const payload = await this.verifyRefreshToken(dto.refresh_token);
    const sessionId = payload.session_id ?? payload.sid;
    if (!sessionId) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.portalSessionsRepository.findOneBy({
      id: sessionId,
      client_id: payload.sub,
      organization_id: payload.organization_id,
      revoked_at: IsNull(),
    });
    if (!session || session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const refreshMatches = await bcrypt.compare(
      dto.refresh_token,
      session.refresh_token_hash,
    );
    if (!refreshMatches) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    session.revoked_at = new Date();
    await this.portalSessionsRepository.save(session);

    const client = await this.clientsRepository.findOneBy({
      id: payload.sub,
      organization_id: payload.organization_id,
    });
    if (!client) {
      throw new UnauthorizedException('Client is not active in portal');
    }

    const tokens = await this.generateTokens(client);
    return {
      client: this.buildClientProfile(client),
      ...tokens,
    };
  }

  async me(user: AuthenticatedPortalClient) {
    const client = await this.clientsRepository.findOneBy({
      id: user.sub,
      organization_id: user.organization_id,
    });
    if (!client) {
      throw new UnauthorizedException('Client is not active in portal');
    }

    return {
      client: this.buildClientProfile(client),
    };
  }

  async logout(user: AuthenticatedPortalClient) {
    const sessionId = user.session_id ?? user.sid;
    if (!sessionId) {
      throw new UnauthorizedException('Token missing session identifier');
    }

    await this.portalSessionsRepository.update(
      {
        id: sessionId,
        client_id: user.sub,
        organization_id: user.organization_id,
        revoked_at: IsNull(),
      },
      { revoked_at: new Date() },
    );

    return { revoked: true };
  }

  private buildClientProfile(client: Client) {
    return {
      id: client.id,
      name: client.name,
      email: client.email,
      portalEnabled: true,
    };
  }

  private async generateTokens(client: Client): Promise<PortalTokens> {
    const accessSecret =
      this.configService.get<string>('PORTAL_JWT_ACCESS_SECRET') ??
      this.configService.get<string>('config.portalJwtAccessSecret') ??
      resolveJwtSecret(this.configService, 'JWT_ACCESS_SECRET');
    const refreshSecret =
      this.configService.get<string>('PORTAL_JWT_REFRESH_SECRET') ??
      this.configService.get<string>('config.portalJwtRefreshSecret') ??
      resolveJwtSecret(this.configService, 'JWT_REFRESH_SECRET');
    const accessTtl =
      this.configService.get<string>('PORTAL_JWT_ACCESS_TTL') ??
      this.configService.get<string>('config.portalJwtAccessTtl') ??
      DEFAULT_ACCESS_TOKEN_TTL;
    const refreshTtl =
      this.configService.get<string>('PORTAL_JWT_REFRESH_TTL') ??
      this.configService.get<string>('config.portalJwtRefreshTtl') ??
      DEFAULT_REFRESH_TOKEN_TTL;
    const accessMs = parseDurationToMs(accessTtl) ?? 15 * 60_000;
    const refreshMs = parseDurationToMs(refreshTtl) ?? 7 * 24 * 60 * 60 * 1000;
    const sessionId = randomUUID();
    const payload: AuthenticatedPortalClient = {
      sub: client.id,
      email: client.email ?? '',
      organization_id: client.organization_id,
      type: 'portal-client',
      session_id: sessionId,
      sid: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: accessSecret,
        expiresIn: Math.floor(accessMs / 1000),
      }),
      this.jwtService.signAsync(payload, {
        secret: refreshSecret,
        expiresIn: Math.floor(refreshMs / 1000),
      }),
    ]);

    const refreshTokenHash = await bcrypt.hash(refreshToken, this.bcryptSaltRounds);
    const session = this.portalSessionsRepository.create({
      id: sessionId,
      client_id: client.id,
      organization_id: client.organization_id,
      refresh_token_hash: refreshTokenHash,
      expires_at: new Date(Date.now() + refreshMs),
      revoked_at: null,
    });
    await this.portalSessionsRepository.save(session);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private hashSetupToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  private async verifyRefreshToken(token: string) {
    const refreshSecret =
      this.configService.get<string>('PORTAL_JWT_REFRESH_SECRET') ??
      this.configService.get<string>('config.portalJwtRefreshSecret') ??
      resolveJwtSecret(this.configService, 'JWT_REFRESH_SECRET');

    try {
      return await this.jwtService.verifyAsync<AuthenticatedPortalClient>(token, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

}
