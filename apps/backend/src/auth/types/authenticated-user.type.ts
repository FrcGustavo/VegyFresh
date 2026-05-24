import { OrganizationUserRole } from '../../organizations/entities/organization-user.entity';

export type AuthenticatedUser = {
  sub: string;
  email: string;
  org_id: string;
  membership_id: string;
  role: OrganizationUserRole;
  permissions: string[];
  session_id: string;
  sid?: string;
};
