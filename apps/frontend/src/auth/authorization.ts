import type { AuthRole } from './authApi';

const USERS_RESOURCE_ROLES = new Set(['owner', 'admin']);

export const hasPermission = (
  grantedPermissions: string[] | null | undefined,
  required: string,
): boolean => {
  const permissions = grantedPermissions ?? [];

  if (permissions.includes('*') || permissions.includes(required)) {
    return true;
  }

  const [resource] = required.split(':');
  return permissions.includes(`${resource}:*`);
};

export const canAccessUsersResource = (
  role: AuthRole | null | undefined,
): boolean =>
  Boolean(
    role &&
      USERS_RESOURCE_ROLES.has(role.name.toLowerCase()) &&
      hasPermission(role.permissions, 'users:manage'),
  );
