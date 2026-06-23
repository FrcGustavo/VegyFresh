export const USER_COLUMNS = [
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
    defaultWidth: 240,
    sortable: true,
  },
  {
    key: "email",
    label: "Email",
    minWidth: 220,
    defaultWidth: 300,
    sortable: false,
  },
] as const;

export const USERS_PAGE_SIZE = 25;
