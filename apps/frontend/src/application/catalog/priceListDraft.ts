export interface PriceListDraftRow {
  product_id: string;
  price: number | string;
}
export type PriceListDraftResult =
  | {
      success: true;
      value: {
        name: string;
        products: Array<{ product_id: string; price: number }>;
      };
    }
  | { success: false; error: string };

export function preparePriceList(
  name: string,
  rows: PriceListDraftRow[],
): PriceListDraftResult {
  if (!name.trim())
    return {
      success: false,
      error: "Completa el nombre de la lista de precios.",
    };
  const assigned = rows.filter((row) => row.product_id || row.price !== "");
  if (
    assigned.some(
      (row) =>
        !row.product_id ||
        row.price === "" ||
        !Number.isFinite(Number(row.price)) ||
        Number(row.price) < 0,
    )
  ) {
    return {
      success: false,
      error: "Completa el producto y un precio válido en cada fila.",
    };
  }
  const ids = assigned.map((row) => row.product_id);
  if (new Set(ids).size !== ids.length)
    return {
      success: false,
      error: "Cada producto solo puede asignarse una vez.",
    };
  return {
    success: true,
    value: {
      name: name.trim(),
      products: assigned.map((row) => ({
        product_id: row.product_id,
        price: Number(row.price),
      })),
    },
  };
}
