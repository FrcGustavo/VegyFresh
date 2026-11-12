import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { extractRolePermissions } from '../auth/utils/role-permissions';
import { Client } from '../clients/entities/client.entity';
import { User } from '../users/entities/user.entity';
import {
  ExternalIdentity,
  ExternalIdentityType,
} from './entities/external-identity.entity';

@Injectable()
export class IdentityService {
  constructor(
    @InjectRepository(ExternalIdentity)
    private readonly externalIdentities: Repository<ExternalIdentity>,
    @InjectRepository(User)
    private readonly users: Repository<User>,
    @InjectRepository(Client)
    private readonly clients: Repository<Client>,
  ) {}

  async resolveUser(issuer: string, subject: string) {
    const identity = await this.findIdentity(issuer, subject, 'user');
    if (!identity.user_id) {
      throw new UnauthorizedException('Identity is not linked to a user');
    }

    const user = await this.users.findOne({
      where: { id: identity.user_id },
      relations: { role: true, organization: true },
    });
    if (
      !user?.role ||
      !user.organization_id ||
      !user.organization ||
      user.organization.id !== user.organization_id ||
      !Array.isArray(user.role.permissions)
    ) {
      throw new UnauthorizedException('Linked user is incomplete or inactive');
    }

    return {
      sub: user.id,
      email: user.email,
      org_id: user.organization.id,
      role: user.role.name,
      permissions: extractRolePermissions(user.role.permissions),
    };
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

  private async findIdentity(
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
    const identity = await this.externalIdentities.findOne({
      where: { issuer, subject, identity_type: identityType },
    });
    if (!identity) {
      throw new UnauthorizedException('External identity is not linked');
    }
    return identity;
  }
}
