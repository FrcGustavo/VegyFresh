export const SEED_PREFIX = "VEGY-SEED";

export const TARGETS = {
  products: 200,
  users: 5,
  clients: 50,
  suppliers: 50,
  priceLists: 5,
  purchases: 200,
  orders: 200,
} as const;

export const PRICE_LISTS = [
  { name: "Lista Minorista", multiplier: 1 },
  { name: "Lista Mayorista", multiplier: 0.86 },
  { name: "Lista Restaurantes", multiplier: 0.9 },
  { name: "Lista Hoteles", multiplier: 0.88 },
  { name: "Lista Distribuidores", multiplier: 0.82 },
] as const;

export const ALL_ITEMS_QUERY = { limit: "500" } as const;
export const ALL_ORDERS_QUERY = { limit: 500, offset: 0 } as const;

export const ADMIN_PERMISSIONS = [
  { action: "manage", resource: "users" },
  { action: "read", resource: "orders" },
  { action: "manage", resource: "orders" },
  { action: "read", resource: "catalog" },
  { action: "manage", resource: "catalog" },
  { action: "read", resource: "inventory" },
  { action: "manage", resource: "inventory" },
];

export const OPERATOR_PERMISSIONS = [
  { action: "read", resource: "orders" },
  { action: "manage", resource: "orders" },
  { action: "read", resource: "catalog" },
  { action: "read", resource: "inventory" },
  { action: "manage", resource: "inventory" },
];
