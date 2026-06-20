export type SortByField = "folio" | "name";
export type SortOrder = "asc" | "desc";

export interface UserListItem {
  id: string | number;
  folio?: string | null;
  name?: string | null;
  email?: string | null;
}
