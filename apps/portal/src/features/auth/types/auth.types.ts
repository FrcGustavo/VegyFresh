export type PortalClientProfile = {
  id: string;
  name: string;
  email: string | null;
  portalEnabled: boolean;
};

export type PortalAuthResponse = {
  client: PortalClientProfile;
  access_token: string;
  refresh_token: string;
};
