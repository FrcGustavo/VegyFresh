import {
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { isEmail } from 'class-validator';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { extractRolePermissions } from '../auth/utils/role-permissions';
import {
  ExternalIdentity,
  ExternalIdentityType,
} from './entities/external-identity.entity';

export type KeycloakAdminProfileClaims = {
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
};

type AdminProfile = {
  email: string;
  name: string;
};

const ORGLESS_OWNER_FOLIO = 'U0001';

@Injectable()
export class IdentityService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ExternalIdentity)
    private readonly externalIdentities: Repository<ExternalIdentity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Client)
    private readonly clients: Repository<Client>,
  ) {}

  async resolveUser(issuer: string, subject: string) {
    const identity = await this.findIdentity(issuer, subject, 'user');
    return this.resolveLinkedUser(identity, this.users, false);
  }

  async resolveAdminUser(
    issuer: string,
    subject: string,
    profileClaims: KeycloakAdminProfileClaims,
  ) {
    const linkedIdentity = await this.findIdentityOrNull(
      issuer,
      subject,
      'user',
    );
    if (linkedIdentity) return this.resolveLinkedUser(linkedIdentity);

    try {
      return await this.dataSource.transaction(async (manager) => {
        await this.lockProvisioningKey(manager, [
          'admin-subject',
          issuer,
          subject,
        ]);

        const identities = manager.getRepository(ExternalIdentity);
        const users = manager.getRepository(User);
        const existingIdentity = await identities.findOneBy({
          issuer,
          subject,
          identity_type: 'user',
        });
        if (existingIdentity) {
          return this.resolveLinkedUser(existingIdentity, users);
        }

        const profile = this.resolveAdminProfile(profileClaims);
        await this.lockProvisioningKey(manager, ['user-email', profile.email]);

        const existingUser = await users
          .createQueryBuilder('user')
          .where('LOWER(BTRIM(user.email)) = :email', {
            email: profile.email,
          })
          .getOne();
        if (existingUser) {
          throw this.userNotLinked();
        }

        const ownerRole = await manager
          .getRepository(Role)
          .findOneBy({ name: 'owner' });
        if (!ownerRole) {
          throw new InternalServerErrorException(
            'The owner role is not configured',
          );
        }

        const user = users.create({
          name: profile.name,
          folio: ORGLESS_OWNER_FOLIO,
          email: profile.email,
          role_id: ownerRole.id,
          role: ownerRole,
          organization_id: null,
          organization: null,
          avatar_url: null,
        });
        const savedUser = await users.save(user);

        const identity = identities.create({
          issuer,
          subject,
          identity_type: 'user',
          user_id: savedUser.id,
          client_id: null,
        });
        await identities.save(identity);

        return this.toAuthenticatedUser(savedUser);
      });
    } catch (error) {
      if (!this.isUniqueViolation(error)) throw error;

      const racedIdentity = await this.findIdentityOrNull(
        issuer,
        subject,
        'user',
      );
      if (racedIdentity) return this.resolveLinkedUser(racedIdentity);

      const profile = this.resolveAdminProfile(profileClaims);
      const emailOwner = await this.findUserByNormalizedEmail(profile.email);
      if (emailOwner) throw this.userNotLinked();

      throw error;
    }
  }

  async resolvePortalClient(issuer: string, subject: string) {
    const identity = await this.findIdentity(issuer, subject, 'portal-client');
    if (!identity.client_id) {
      throw new UnauthorizedException(
        'Identity is not linked to a portal client',
      );
    }

    const client = await this.clients.findOne({
      where: { id: identity.client_id },
      relations: { organization: true },
    });
    if (
      !client?.organization_id ||
      !client.organization ||
      client.organization.id !== client.organization_id
    ) {
      throw new UnauthorizedException(
        'Linked portal client is incomplete or inactive',
      );
    }

    return {
      sub: client.id,
      email: client.email ?? '',
      organization_id: client.organization.id,
      type: 'portal-client' as const,
    };
  }

  private async resolveLinkedUser(
    identity: ExternalIdentity,
    users: Repository<User> = this.users,
    allowOrgless = true,
  ) {
    if (!identity.user_id) {
      throw new UnauthorizedException('Identity is not linked to a user');
    }

    const user = await users.findOne({
      where: { id: identity.user_id },
      relations: { role: true, organization: true },
    });
    if (
      !user?.role ||
      !Array.isArray(user.role.permissions) ||
      (!allowOrgless && !user.organization_id) ||
      (user.organization_id &&
        user.organization?.id !== user.organization_id) ||
      (!user.organization_id && user.organization)
    ) {
      throw new UnauthorizedException('Linked user is not active');
    }

    return this.toAuthenticatedUser(user);
  }

  private toAuthenticatedUser(user: User) {
    if (!user.role) {
      throw new UnauthorizedException('Linked user is not active');
    }

    return {
      sub: user.id,
      email: user.email,
      org_id: user.organization?.id ?? '',
      role: user.role.name,
      permissions: extractRolePermissions(user.role.permissions),
    };
  }

  private resolveAdminProfile(
    claims: KeycloakAdminProfileClaims,
  ): AdminProfile {
    if (typeof claims.email !== 'string') {
      throw this.profileIncomplete();
    }

    const email = claims.email.trim().toLowerCase();
    if (email.length > 254 || !isEmail(email)) {
      throw this.profileIncomplete();
    }

    const nameClaim = [claims.name, claims.preferred_username, email].find(
      (value): value is string =>
        typeof value === 'string' && value.trim().length > 0,
    );
    const name = nameClaim?.trim();
    if (!name || name.length > 255) {
      throw this.profileIncomplete();
    }

    return { email, name };
  }

  private async lockProvisioningKey(
    manager: EntityManager,
    key: string[],
  ): Promise<void> {
    await manager.query(
      'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
      [JSON.stringify(['vegyfresh', ...key])],
    );
  }

  private async findUserByNormalizedEmail(email: string) {
    return this.users
      .createQueryBuilder('user')
      .where('LOWER(BTRIM(user.email)) = :email', { email })
      .getOne();
  }

  private async findIdentity(
    issuer: string,
    subject: string,
    identityType: ExternalIdentityType,
  ) {
    const identity = await this.findIdentityOrNull(
      issuer,
      subject,
      identityType,
    );
    if (!identity) {
      throw new UnauthorizedException('External identity is not linked');
    }
    return identity;
  }

  private findIdentityOrNull(
    issuer: string,
    subject: string,
    identityType: ExternalIdentityType,
  ) {
    if (
      typeof issuer !== 'string' ||
      !issuer ||
      typeof subject !== 'string' ||
      !subject
    ) {
      throw new UnauthorizedException('External identity is not linked');
    }
    return this.externalIdentities.findOne({
      where: {
        issuer,
        subject,
        identity_type: identityType,
      },
    });
  }

  private profileIncomplete() {
    return new ForbiddenException({
      code: 'USER_PROFILE_INCOMPLETE',
      message: 'User profile is incomplete',
    });
  }

  private userNotLinked() {
    return new ForbiddenException({
      code: 'USER_NOT_LINKED',
      message:
        'An existing local profile for this email must be linked by an administrator',
    });
  }

  private isUniqueViolation(error: unknown) {
    const databaseError = error as {
      code?: string;
      driverError?: { code?: string };
    };
    return (
      databaseError?.code === '23505' ||
      databaseError?.driverError?.code === '23505'
    );
  }
}
