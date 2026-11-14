export type AuthenticatedPortalClient = {
  sub: string;
  email: string;
  organization_id: string;
  type: 'portal-client';
};
