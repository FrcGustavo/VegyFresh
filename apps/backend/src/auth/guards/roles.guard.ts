import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import { permissionsForRole } from '../constants/org-role-permissions';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
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
    if (!user?.sub || !user.org_id || !user.membership_id || !user.role) {
      throw new ForbiddenException(
        'User context is missing organization scope',
      );
    }

    const role = user.role;
    const grantedPermissions =
      user.permissions?.length > 0
        ? user.permissions
        : permissionsForRole(role);

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

  private hasPermission(
    grantedPermissions: string[],
    required: string,
  ): boolean {
    if (
      grantedPermissions.includes('*') ||
      grantedPermissions.includes(required)
    ) {
      return true;
    }

    const [resource] = required.split(':');
    return grantedPermissions.includes(`${resource}:*`);
  }
}
