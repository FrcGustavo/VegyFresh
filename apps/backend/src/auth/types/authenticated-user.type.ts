export type AuthenticatedUser = {
  sub: string;
  email: string;
  org_id: string;
  role: string;
  permissions: string[];
  session_id: string;
  sid?: string;
};
