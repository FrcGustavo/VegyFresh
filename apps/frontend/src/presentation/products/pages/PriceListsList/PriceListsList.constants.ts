import { LIST_PAGE_SIZE } from "@/application/query/listDefaults";

export const PRICE_LIST_COLUMNS = [
  {
    key: "folio",
    label: "Folio",
    minWidth: 140,
    defaultWidth: 180,
    sortable: true,
  },
  {
    key: "name",
    label: "Nombre",
    minWidth: 180,
    defaultWidth: 280,
    sortable: true,
  },
] as const;

export const PRICE_LISTS_PAGE_SIZE = LIST_PAGE_SIZE;
