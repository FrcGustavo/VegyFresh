export type PurchaseSortField =
  | "purchase_date"
  | "folio"
  | "supplier"
  | "total"
  | "notes";
export type SortOrder = "asc" | "desc";

export interface PurchaseListItem {
  id: string;
  folio?: string | null;
  purchase_date?: string | null;
  notes?: string | null;
  supplier?: { name?: string | null } | null;
  items?: Array<{ subtotal?: number | string | null }> | null;
}
