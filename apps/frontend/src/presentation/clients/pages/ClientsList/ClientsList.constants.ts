export const CLIENT_COLUMNS = [
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
    key: "phone_number",
    label: "Teléfono",
    minWidth: 180,
    defaultWidth: 220,
    sortable: false,
  },
] as const;

export const CLIENTS_PAGE_SIZE = 25;
