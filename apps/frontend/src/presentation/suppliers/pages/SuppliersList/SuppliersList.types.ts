export type SortByField = "folio" | "name";
export type SortOrder = "asc" | "desc";

export interface SupplierListItem {
  id: string | number;
  folio?: string | null;
  name?: string | null;
  email?: string | null;
  phone_number?: string | null;
}
