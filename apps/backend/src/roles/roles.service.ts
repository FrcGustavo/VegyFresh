import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { Repository } from 'typeorm';

type RolePermission = Record<string, unknown>;

type DefaultRoleDefinition = {
  name: string;
  permissions: RolePermission[];
};

const DEFAULT_ROLES: DefaultRoleDefinition[] = [
  {
    name: 'owner',
    permissions: [
      { action: '*', resource: '*' },
      { action: 'manage', resource: 'organization' },
    ],
  },
  {
    name: 'admin',
    permissions: [
      { action: 'manage', resource: 'users' },
      { action: 'read', resource: 'orders' },
      { action: 'manage', resource: 'orders' },
      { action: 'read', resource: 'catalog' },
      { action: 'manage', resource: 'catalog' },
      { action: 'read', resource: 'inventory' },
      { action: 'manage', resource: 'inventory' },
    ],
  },
];

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async onModuleInit() {
    await this.setupDefaultRoles();
  }

  async setupDefaultRoles() {
    for (const roleDefinition of DEFAULT_ROLES) {
      await this.ensureRole(roleDefinition.name, roleDefinition.permissions);
    }
  }

  async ensureRole(name: string, permissions: RolePermission[]) {
    console.log(`Ensuring role: ${name}`);
    const existingRole = await this.rolesRepository.findOneBy({ name });
    if (existingRole) {
      return existingRole;
    }

    const role = this.rolesRepository.create({
      name,
      permissions,
    });

    return this.rolesRepository.save(role);
  }

  async getOwnerRole() {
    const ownerRole = await this.rolesRepository.findOneBy({ name: 'owner' });

    if (!ownerRole) {
      throw new Error('Owner role not found');
    }

    return ownerRole;
  }
}
