type RolePermission = Record<string, unknown> | string;

const normalizePermissionRecord = (permission: Record<string, unknown>) => {
  const action =
    typeof permission.action === 'string' ? permission.action.trim() : '';
  const resource =
    typeof permission.resource === 'string' ? permission.resource.trim() : '';

  if (!action || !resource) {
    return null;
  }

  if (action === '*' && resource === '*') {
    return '*';
  }

  if (action === '*') {
    return `${resource}:*`;
  }

  return `${resource}:${action}`;
};

export const extractRolePermissions = (
  permissions: RolePermission[],
): string[] => {
  const parsedPermissions = permissions
    .map((permission) => {
      if (typeof permission === 'string') {
        return permission.trim() || null;
      }

      return normalizePermissionRecord(permission);
    })
    .filter((permission): permission is string => Boolean(permission));

  return Array.from(new Set(parsedPermissions));
};
