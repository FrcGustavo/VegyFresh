export const PURCHASE_COLUMNS = [
  {
    key: "purchase_date",
    label: "Fecha",
    minWidth: 130,
    defaultWidth: 160,
    sortable: true,
  },
  {
    key: "folio",
    label: "Folio",
    minWidth: 130,
    defaultWidth: 160,
    sortable: true,
  },
  {
    key: "supplier",
    label: "Proveedor",
    minWidth: 180,
    defaultWidth: 260,
    sortable: true,
  },
  {
    key: "total",
    label: "Total",
    minWidth: 120,
    defaultWidth: 160,
    sortable: true,
  },
  {
    key: "notes",
    label: "Notas",
    minWidth: 180,
    defaultWidth: 280,
    sortable: true,
  },
] as const;
