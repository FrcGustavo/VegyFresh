export const SUPPLIER_COLUMNS = [
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
    defaultWidth: 260,
    sortable: true,
  },
  {
    key: "email",
    label: "Email",
    minWidth: 200,
    defaultWidth: 260,
    sortable: false,
  },
  {
    key: "phone_number",
    label: "Teléfono",
    minWidth: 160,
    defaultWidth: 220,
    sortable: false,
  },
] as const;

export const SUPPLIERS_PAGE_SIZE = 25;
