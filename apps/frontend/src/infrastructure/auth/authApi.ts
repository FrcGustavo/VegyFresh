export type { AuthRole } from "@/domain/auth/AuthRole";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthOrganization {
  id: string;
  name: string;
  folio: string;
}
