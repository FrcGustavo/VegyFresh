export interface PurchaseDraftItem {
  product_id: string;
  quantity: string;
  unit_cost: string;
}

export function validPurchaseItems(items: PurchaseDraftItem[]) {
  return items
    .filter((item) => item.product_id.trim())
    .map((item) => ({
      product_id: item.product_id,
      quantity: Number(item.quantity),
      unit_cost: Number(item.unit_cost),
    }))
    .filter(
      (item) =>
        Number.isFinite(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.unit_cost) &&
        item.unit_cost > 0,
    );
}

export function purchaseTotal(items: ReturnType<typeof validPurchaseItems>) {
  return items.reduce(
    (sum, item) => sum + Number((item.quantity * item.unit_cost).toFixed(2)),
    0,
  );
}
