import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import type { AuthenticatedUser } from './types/authenticated-user.type';
import { extractRolePermissions } from './utils/role-permissions';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

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
}
