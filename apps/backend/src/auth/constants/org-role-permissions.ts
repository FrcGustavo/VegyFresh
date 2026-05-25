import { OrganizationUserRole } from '../../organizations/entities/organization-user.entity';

export const ORG_ROLE_PERMISSIONS: Record<OrganizationUserRole, string[]> = {
  [OrganizationUserRole.OWNER]: ['*'],
  [OrganizationUserRole.ADMIN]: [
    'organization:manage',
    'users:manage',
    'catalog:read',
    'catalog:manage',
    'orders:read',
    'orders:manage',
  ],
  [OrganizationUserRole.MEMBER]: ['catalog:read', 'orders:read'],
};

export const permissionsForRole = (role: OrganizationUserRole): string[] =>
  ORG_ROLE_PERMISSIONS[role] ??
  ORG_ROLE_PERMISSIONS[OrganizationUserRole.MEMBER];
