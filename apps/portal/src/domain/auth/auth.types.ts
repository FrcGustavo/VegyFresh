export type PortalClientProfile = {
  id: string;
  name: string;
  email: string | null;
  portalEnabled: boolean;
};

export type PortalSessionSnapshot = {
  provider: "keycloak";
  authenticated: boolean | null;
  client?: PortalClientProfile;
};
