import type { Organization } from "../../../api";
import type { OrganizationFormData } from "./OrganizationForm";

export const EMPTY_ORGANIZATION_FORM: OrganizationFormData = {
  name: "",
  logo_url: null,
  legal_name: null,
  email: null,
  phone_number: null,
  address: null,
  product_folio_prefix: "P",
  price_list_folio_prefix: "L",
  order_folio_prefix: "O",
  client_folio_prefix: "C",
  supplier_folio_prefix: "S",
  purchase_folio_prefix: "C",
};

export const organizationToFormData = (
  organization: Organization,
): OrganizationFormData => ({
  name: organization.name ?? "",
  logo_url: organization.logo_url ?? null,
  legal_name: organization.legal_name ?? null,
  email: organization.email ?? null,
  phone_number: organization.phone_number ?? null,
  address: organization.address ?? null,
  product_folio_prefix: organization.product_folio_prefix ?? null,
  price_list_folio_prefix: organization.price_list_folio_prefix ?? null,
  order_folio_prefix: organization.order_folio_prefix ?? null,
  client_folio_prefix: organization.client_folio_prefix ?? null,
  supplier_folio_prefix: organization.supplier_folio_prefix ?? null,
  purchase_folio_prefix: organization.purchase_folio_prefix ?? null,
});
