export type SortByField = "folio" | "name" | "unit";
export type SortOrder = "asc" | "desc";

export interface ProductListItem {
  id: string | number;
  folio?: string | null;
  name?: string | null;
  unit?: string | null;
}
