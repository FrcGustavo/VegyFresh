import { organizationsApi } from "../../api";
import type { Organization, UpdateOrganizationInput } from "../../api";

export type OrganizationDto = Organization;
export type UpdateOrganizationPayload = UpdateOrganizationInput;

export const organizationApi = {
  create: organizationsApi.create,
  getById: organizationsApi.get,
  update: organizationsApi.update,
};
