import {
  BadRequestException,
  InternalServerErrorException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Organization } from '../organizations/entities/organization.entity';
import {
  OrganizationUser,
  OrganizationUserRole,
} from '../organizations/entities/organization-user.entity';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { AuthSession } from './entities/auth-session.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { permissionsForRole } from './constants/org-role-permissions';
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
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(OrganizationUser)
    private readonly organizationUsersRepository: Repository<OrganizationUser>,
    @InjectRepository(AuthSession)
    private readonly authSessionsRepository: Repository<AuthSession>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.bcryptSaltRounds = resolveBcryptSaltRounds(this.configService);
  }

  async signup(dto: SignupDto) {
    const existingUser = await this.usersRepository.findOneBy({
      email: dto.email,
    });
    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, this.bcryptSaltRounds);
    const ownerRole = await this.findOrCreateOwnerRole();

    const result = await this.usersRepository.manager.transaction(
      async (manager) => {
        const userFolio = await this.buildUserFolio(manager);
        const orgFolio = await this.buildOrganizationFolio(manager);

        const userRepository = manager.getRepository(User);
        const organizationRepository = manager.getRepository(Organization);
        const organizationUsersRepository =
          manager.getRepository(OrganizationUser);

        const user = userRepository.create({
          name: dto.name,
          folio: userFolio,
          email: dto.email,
          password_hash: passwordHash,
          role_id: ownerRole.id,
          role: ownerRole,
          avatar_url: null,
        });
        const savedUser = await userRepository.save(user);

        const organization = organizationRepository.create({
          folio: orgFolio,
          name: dto.organization_name,
          legal_name: dto.organization_legal_name ?? null,
          email: dto.email,
          phone_number: dto.organization_phone_number ?? null,
          address: dto.organization_address ?? null,
        });
        const savedOrganization =
          await organizationRepository.save(organization);

        const membership = organizationUsersRepository.create({
          user_id: savedUser.id,
          user: savedUser,
          organization_id: savedOrganization.id,
          organization: savedOrganization,
          role: OrganizationUserRole.OWNER,
        });
        const savedMembership =
          await organizationUsersRepository.save(membership);

        return {
          user: savedUser,
          organization: savedOrganization,
          membership: savedMembership,
        };
      },
    );

    const tokens = await this.generateTokens({
      sub: result.user.id,
      email: result.user.email,
      org_id: result.organization.id,
      membership_id: result.membership.id,
      role: result.membership.role,
      permissions: permissionsForRole(result.membership.role),
      session_id: '',
    });

    return {
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        folio: result.organization.folio,
      },
      membership: {
        id: result.membership.id,
        role: result.membership.role,
      },
      ...tokens,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepository.findOneBy({ email: dto.email });
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

    const memberships = await this.organizationUsersRepository.find({
      where: {
        user_id: user.id,
        is_active: true,
      },
      relations: { organization: true },
      order: { created_at: 'ASC' },
    });

    if (memberships.length === 0) {
      throw new UnauthorizedException('User has no active organization');
    }

    const membership =
      dto.organization_id !== undefined
        ? memberships.find(
            (item) => item.organization_id === dto.organization_id,
          )
        : memberships[0];

    if (!membership) {
      throw new UnauthorizedException(
        `User does not belong to organization ${dto.organization_id}`,
      );
    }

    const tokens = await this.generateTokens({
      sub: user.id,
      email: user.email,
      org_id: membership.organization_id,
      membership_id: membership.id,
      role: membership.role,
      permissions: permissionsForRole(membership.role),
      session_id: '',
    });

    return {
      user: { id: user.id, name: user.name, email: user.email },
      organization: {
        id: membership.organization_id,
        name: membership.organization.name,
        folio: membership.organization.folio,
      },
      membership: { id: membership.id, role: membership.role },
      ...tokens,
    };
  }

  async refreshToken(user: AuthenticatedUser, refreshToken: string) {
    const sessionId = this.extractSessionId(user);
    const session = await this.authSessionsRepository.findOne({
      where: { id: sessionId, user_id: user.sub, revoked_at: IsNull() },
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

    const membership = await this.organizationUsersRepository.findOne({
      where: {
        id: session.membership_id,
        user_id: user.sub,
        organization_id: session.organization_id,
        is_active: true,
      },
    });
    if (!membership) {
      throw new UnauthorizedException('Membership is not active');
    }

    session.revoked_at = new Date();
    await this.authSessionsRepository.save(session);

    return this.generateTokens({
      sub: user.sub,
      email: user.email,
      org_id: session.organization_id,
      membership_id: session.membership_id,
      role: membership.role,
      permissions: permissionsForRole(membership.role),
      session_id: '',
    });
  }

  async me(user: AuthenticatedUser) {
    const dbUser = await this.usersRepository.findOneBy({ id: user.sub });
    if (!dbUser) {
      throw new NotFoundException(`User with id ${user.sub} not found`);
    }

    const membership = await this.organizationUsersRepository.findOne({
      where: { id: user.membership_id },
      relations: { organization: true },
    });
    if (!membership) {
      throw new NotFoundException(
        `Membership with id ${user.membership_id} not found`,
      );
    }

    return {
      user: {
        id: dbUser.id,
        name: dbUser.name,
        email: dbUser.email,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        folio: membership.organization.folio,
      },
      membership: {
        id: membership.id,
        role: membership.role,
      },
    };
  }

  async logout(user: AuthenticatedUser) {
    const sessionId = this.extractSessionId(user);
    await this.authSessionsRepository.update(
      { id: sessionId, user_id: user.sub, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
    return { revoked: true };
  }

  async logoutAll(user: AuthenticatedUser) {
    await this.authSessionsRepository.update(
      { user_id: user.sub, organization_id: user.org_id, revoked_at: IsNull() },
      { revoked_at: new Date() },
    );
    return { revoked: true };
  }

  private async findOrCreateOwnerRole() {
    const existingRole = await this.rolesRepository.findOneBy({
      name: 'owner',
    });
    if (existingRole) {
      return existingRole;
    }

    const role = this.rolesRepository.create({
      name: 'owner',
      permissions: [
        { action: '*', resource: '*' },
        { action: 'manage', resource: 'organization' },
      ],
    });
    return this.rolesRepository.save(role);
  }

  private async generateTokens(
    payload: AuthenticatedUser,
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

    const tokenPayload: AuthenticatedUser = {
      ...payload,
      session_id: sessionId,
      sid: sessionId,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(tokenPayload, {
        secret: accessSecret,
        expiresIn: accessTtl as unknown as number,
      }),
      this.jwtService.signAsync(tokenPayload, {
        secret: refreshSecret,
        expiresIn: refreshTtl as unknown as number,
      }),
    ]);
    const refreshTokenHash = await bcrypt.hash(refreshToken, this.bcryptSaltRounds);

    const session = this.authSessionsRepository.create({
      id: sessionId,
      user_id: payload.sub,
      organization_id: payload.org_id,
      membership_id: payload.membership_id,
      refresh_token_hash: refreshTokenHash,
      expires_at: this.addMilliseconds(Date.now(), this.parseDuration(refreshTtl)),
      revoked_at: null,
    });
    await this.authSessionsRepository.save(session);

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
        error instanceof Error ? error.message : 'JWT secrets are not configured';
      throw new InternalServerErrorException(message);
    }
  }

  private async buildUserFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('users_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `U${String(folioNumber).padStart(5, '0')}`;
  }

  private async buildOrganizationFolio(manager: {
    query: (query: string) => Promise<Array<{ folio: string | number }>>;
  }) {
    const [result] = await manager.query(
      `SELECT nextval('organizations_folio_seq') AS folio`,
    );
    const folioNumber = Number(result?.folio ?? 0);
    return `O${String(folioNumber).padStart(5, '0')}`;
  }
}
