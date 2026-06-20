export type SortByField = "folio" | "name";
export type SortOrder = "asc" | "desc";

export interface ClientListItem {
  id: string | number;
  folio?: string | null;
  name?: string | null;
  phone_number?: string | null;
}
