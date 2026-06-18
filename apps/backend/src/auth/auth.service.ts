import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthSession } from './entities/auth-session.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { extractRolePermissions } from './utils/role-permissions';
import { RolesService } from '../roles/roles.service';
import {
  DEFAULT_ACCESS_TOKEN_TTL,
  DEFAULT_REFRESH_TOKEN_TTL,
  DEFAULT_REFRESH_TOKEN_TTL_MS,
  MAX_ACCESS_TOKEN_TTL_MS,
  MAX_REFRESH_TOKEN_TTL_MS,
  MIN_ACCESS_TOKEN_TTL_MS,
  MIN_REFRESH_TOKEN_TTL_MS,
  parseDurationToMs,
  resolveBcryptSaltRounds,
  resolveJwtSecret,
  resolveTokenTtl,
} from './auth-security.config';

type AuthTokens = {
  access_token: string;
  refresh_token: string;
};

@Injectable()
export class AuthService {
  private readonly bcryptSaltRounds: number;

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly rolesService: RolesService,
    @InjectRepository(AuthSession)
    private readonly authSessionsRepository: Repository<AuthSession>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds = resolveBcryptSaltRounds(this.configService);
  }

  async signup(dto: SignupDto) {
    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);
    const ownerRole = await this.rolesService.getOwnerRole();

    const result = await this.usersRepository.manager.transaction(
      async (manager) => {
        const userFolio = 'U0001';
        const userRepository = manager.getRepository(User);

        const user = userRepository.create({
          name: dto.name,
          folio: userFolio,
          email: dto.email,
          password_hash: passwordHash,
          organization_id: null,
          role_id: ownerRole.id,
          role: ownerRole,
          avatar_url: null,
        });
        let savedUser: User;
        try {
          savedUser = await userRepository.save(user);
        } catch (error) {
          if (this.isEmailConflictError(error)) {
            throw new BadRequestException('Email is already registered');
          }
          throw error;
        }

        return {
          user: savedUser,
          role: ownerRole,
        };
      },
    );

    const tokens = await this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      org_id: '', // User has no organization yet; placeholder for org-less state
      role: result.role.name,
      permissions: extractRolePermissions(result.role.permissions),
      session_id: '',
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      role: {
        id: result.role.id,
        name: result.role.name,
        permissions: extractRolePermissions(result.role.permissions),
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOne({
      where: { email: dto.email },
      relations: { role: true, organization: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatch = await bcrypt.compare(
      dto.password,
      user.password_hash,
    );
    if (!passwordMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.role) {
      throw new UnauthorizedException('User is missing role data');
    }

    // Allow login even if user doesn't have organization yet
    // Frontend will redirect to org setup if organization is null
    const orgId = user.organization?.id ?? '';

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      org_id: orgId,
      role: user.role.name,
      permissions: extractRolePermissions(user.role.permissions),
      session_id: '',
    });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      organization: user.organization
        ? {
            id: user.organization.id,
            name: user.organization.name,
            folio: user.organization.folio,
          }
        : null,
      role: {
        id: user.role.id,
        name: user.role.name,
        permissions: extractRolePermissions(user.role.permissions),
      },
      ...tokens,
    };
  }

  async me(user: AuthenticatedUser) {
    const where = user.org_id
      ? {
          id: user.sub,
          organization_id: user.org_id,
        }
      : {
          id: user.sub,
          organization_id: IsNull(),
        };

    const dbUser = await this.usersRepository.findOne({
      where,
      relations: { role: true, organization: true },
    });
    if (!dbUser || !dbUser.role) {
      throw new UnauthorizedException('User is not active in organization');
    }

    return {
      user: { id: dbUser.id, name: dbUser.name, email: dbUser.email },
      organization: dbUser.organization
        ? {
            id: dbUser.organization.id,
            name: dbUser.organization.name,
            folio: dbUser.organization.folio,
          }
        : null,
      role: {
        id: dbUser.role.id,
        name: dbUser.role.name,
        permissions: extractRolePermissions(dbUser.role.permissions),
      },
    };
  }

  async refreshToken(user: AuthenticatedUser, refreshToken: string) {
    const sessionId = this.extractSessionId(user);
    const session = await this.authSessionsRepository.findOne({
      where: {
        id: sessionId,
        user_id: user.sub,
        organization_id: user.org_id,
        revoked_at: IsNull(),
      },
      relations: { organization: true },
    });
    if (!session) {
      throw new UnauthorizedException('Session is invalid or revoked');
    }

    if (session.expires_at.getTime() <= Date.now()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const refreshMatches = await bcrypt.compare(
      refreshToken,
      session.refresh_token_hash,
    );
    if (!refreshMatches) {
      throw new UnauthorizedException('Refresh token mismatch');
    }

    const dbUser = await this.usersRepository.findOne({
      where: {
        id: user.sub,
        organization_id: session.organization_id,
      },
      relations: { role: true },
    });
    if (!dbUser || !dbUser.role) {
      throw new UnauthorizedException('User is not active in organization');
    }

    session.revoked_at = new Date();
    await this.authSessionsRepository.save(session);

    return this.generateTokens({
      sub: user.sub,
      email: user.email,
      org_id: session.organization_id,
      role: dbUser.role.name,
      permissions: extractRolePermissions(dbUser.role.permissions),
      session_id: '',
    });
  }

  async logout(user: AuthenticatedUser) {
    const sessionId = this.extractSessionId(user);
    await this.authSessionsRepository.update(
      {
        id: sessionId,
        user_id: user.sub,
        organization_id: user.org_id,
        revoked_at: IsNull(),
      },
      { revoked_at: new Date() },
    );
    return { revoked: true };
  }

  private async generateTokens(
    payload: AuthenticatedUser,
    authSessionsRepository: Repository<AuthSession> = this
      .authSessionsRepository,
  ): Promise<AuthTokens> {
    const accessSecret = this.resolveSecret('JWT_ACCESS_SECRET');
    const refreshSecret = this.resolveSecret('JWT_REFRESH_SECRET');
    const accessTtl = resolveTokenTtl(
      this.configService,
      'JWT_ACCESS_TTL',
      DEFAULT_ACCESS_TOKEN_TTL,
      MIN_ACCESS_TOKEN_TTL_MS,
      MAX_ACCESS_TOKEN_TTL_MS,
    );
    const refreshTtl = resolveTokenTtl(
      this.configService,
      'JWT_REFRESH_TTL',
      DEFAULT_REFRESH_TOKEN_TTL,
      MIN_REFRESH_TOKEN_TTL_MS,
      MAX_REFRESH_TOKEN_TTL_MS,
    );
    const sessionId = randomUUID();
    const accessExpiresInSeconds = Math.floor(
      this.parseDuration(accessTtl) / 1000,
    );
    const refreshExpiresInSeconds = Math.floor(
      this.parseDuration(refreshTtl) / 1000,
    );

    const tokenPayload: AuthenticatedUser = {
      ...payload,
      session_id: sessionId,
      sid: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresInSeconds,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresInSeconds,
      }),
    ]);
    const refreshTokenHash = await bcrypt.hash(
      refreshToken,
      this.bcryptSaltRounds,
    );

    // Only create session if organization is assigned (org_id is not empty)
    if (payload.org_id) {
      const session = authSessionsRepository.create({
        id: sessionId,
        user_id: payload.sub,
        organization_id: payload.org_id,
        refresh_token_hash: refreshTokenHash,
        expires_at: this.addMilliseconds(
          Date.now(),
          this.parseDuration(refreshTtl),
        ),
        revoked_at: null,
      });
      await authSessionsRepository.save(session);
    }

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private parseDuration(raw: string): number {
    return parseDurationToMs(raw) ?? DEFAULT_REFRESH_TOKEN_TTL_MS;
  }

  private addMilliseconds(base: number, milliseconds: number): Date {
    return new Date(base + milliseconds);
  }

  private extractSessionId(user: AuthenticatedUser): string {
    const sessionId = user.session_id ?? user.sid;
    if (!sessionId) {
      throw new UnauthorizedException('Token missing session identifier');
    }
    return sessionId;
  }

  private resolveSecret(
    key: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
  ): string {
    try {
      return resolveJwtSecret(this.configService, key);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'JWT secrets are not configured';
      throw new InternalServerErrorException(message);
    }
  }

  private isEmailConflictError(error: unknown): boolean {
    if (
      typeof error !== 'object' ||
      error === null ||
      !('code' in error) ||
      (error as { code?: unknown }).code !== '23505'
    ) {
      return false;
    }

    const dbError = error as {
      constraint?: string;
      detail?: string;
      message?: string;
    };

    return Boolean(
      dbError.constraint?.toLowerCase().includes('email') ||
      dbError.detail?.toLowerCase().includes('(email)') ||
      dbError.message?.toLowerCase().includes('email'),
    );
  }
}
