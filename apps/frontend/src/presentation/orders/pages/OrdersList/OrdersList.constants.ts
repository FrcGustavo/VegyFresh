export const ORDER_COLUMNS = [
  {
    key: "created_at",
    label: "Fecha",
    minWidth: 180,
    defaultWidth: 220,
    sortable: true,
  },
  {
    key: "delivery_date",
    label: "Fecha de entrega",
    minWidth: 180,
    defaultWidth: 220,
    sortable: true,
  },
  {
    key: "folio",
    label: "Folio",
    minWidth: 140,
    defaultWidth: 180,
    sortable: true,
  },
  {
    key: "client",
    label: "Nombre del cliente",
    minWidth: 180,
    defaultWidth: 260,
    sortable: true,
  },
  {
    key: "description",
    label: "Descripción",
    minWidth: 220,
    defaultWidth: 300,
    sortable: true,
  },
  {
    key: "total_amount",
    label: "Importe total",
    minWidth: 140,
    defaultWidth: 160,
    sortable: true,
  },
] as const;

export const ORDERS_PAGE_SIZE = 25;
