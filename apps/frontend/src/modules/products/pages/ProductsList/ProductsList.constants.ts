export const PRODUCT_COLUMNS = [
  { key: "folio", label: "Clave", minWidth: 140, defaultWidth: 180, sortable: true },
  { key: "name", label: "Nombre", minWidth: 180, defaultWidth: 260, sortable: true },
  { key: "unit", label: "Unidad de medida", minWidth: 180, defaultWidth: 220, sortable: true },
] as const;

export const PRODUCTS_PAGE_SIZE = 25;
