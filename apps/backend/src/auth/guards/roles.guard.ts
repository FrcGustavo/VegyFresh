import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { Repository } from 'typeorm';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { OrganizationUser } from '../../organizations/entities/organization-user.entity';
import { permissionsForRole } from '../constants/org-role-permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(OrganizationUser)
    private readonly organizationUsersRepository: Repository<OrganizationUser>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (
      (!requiredRoles || requiredRoles.length === 0) &&
      (!requiredPermissions || requiredPermissions.length === 0)
    ) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user?.sub || !user.org_id || !user.membership_id) {
      throw new ForbiddenException('User context is missing organization scope');
    }

    const membership = await this.organizationUsersRepository.findOneBy({
      id: user.membership_id,
      user_id: user.sub,
      organization_id: user.org_id,
      is_active: true,
    });

    if (!membership) {
      throw new ForbiddenException('User is not an active organization member');
    }

    const role = membership.role;
    const grantedPermissions = permissionsForRole(role);

    if (requiredRoles?.length && !requiredRoles.includes(role)) {
      throw new ForbiddenException('Insufficient organization role');
    }

    if (
      requiredPermissions?.length &&
      !requiredPermissions.every((permission) =>
        this.hasPermission(grantedPermissions, permission),
      )
    ) {
      throw new ForbiddenException('Insufficient organization permissions');
    }

    request.user = {
      ...user,
      role,
      permissions: grantedPermissions,
    };

    return true;
  }

  private hasPermission(grantedPermissions: string[], required: string): boolean {
    if (grantedPermissions.includes('*') || grantedPermissions.includes(required)) {
      return true;
    }

    const [resource] = required.split(':');
    return grantedPermissions.includes(`${resource}:*`);
  }
}
