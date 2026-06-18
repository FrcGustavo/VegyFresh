import { fetchApi } from "../../api";

export interface OrganizationDto {
  id: string;
  folio: string;
  name: string;
  logo_url: string | null;
  legal_name: string | null;
  product_folio_prefix: string | null;
  price_list_folio_prefix: string | null;
  order_folio_prefix: string | null;
  client_folio_prefix: string | null;
  supplier_folio_prefix: string | null;
  purchase_folio_prefix: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateOrganizationPayload {
  name: string;
  logo_url: string | null;
  legal_name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  product_folio_prefix: string | null;
  price_list_folio_prefix: string | null;
  order_folio_prefix: string | null;
  client_folio_prefix: string | null;
  supplier_folio_prefix: string | null;
  purchase_folio_prefix: string | null;
}

export const organizationApi = {
  create: (payload: UpdateOrganizationPayload) =>
    fetchApi<OrganizationDto>("/organizations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  getById: (id: string) => fetchApi<OrganizationDto>(`/organizations/${id}`),

  update: (id: string, payload: UpdateOrganizationPayload) =>
    fetchApi<OrganizationDto>(`/organizations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
