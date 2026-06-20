export type OrderSortField =
  | "created_at"
  | "delivery_date"
  | "folio"
  | "client"
  | "description"
  | "total_amount";
export type SortOrder = "asc" | "desc";
export type CreatedFilter = "all" | "today" | "range";

export interface OrderListItem {
  id: string | number;
  created_at?: string | null;
  delivery_date?: string | null;
  folio?: string | null;
  client?: { name?: string | null } | null;
  description?: string | null;
  total_amount?: number | string | null;
}
