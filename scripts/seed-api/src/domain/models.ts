import type {
  CreateOrderInput,
  CreatePurchaseInput,
  Order,
} from "@vegyfresh/api-client";

export interface SupplierSeed {
  key: string;
  name: string;
  email: string;
  phoneNumber: string;
}

export interface ProductSeed {
  key: string;
  name: string;
  description: string;
  supplierKey: string;
  stock: number;
  unit: "kg" | "pz";
  basePrice: number;
}

export interface UserSeed {
  key: string;
  name: string;
  email: string;
  roleName: "admin" | "operativo";
  password: string;
}

export interface ClientSeed {
  key: string;
  name: string;
  phoneNumber: string;
  email: string;
  priceListName: string;
}

export interface PurchaseSeed {
  key: string;
  marker: string;
  input: CreatePurchaseInput;
}

export interface OrderSeed {
  key: string;
  input: CreateOrderInput;
}

const normalizedDate = (value?: string | null) =>
  value ? new Date(value).toISOString() : "";

const itemSignature = (
  items: Array<{ product_id: string; quantity: number; unit_price: number }>,
) =>
  [...items]
    .sort((a, b) => a.product_id.localeCompare(b.product_id))
    .map(
      (item) =>
        `${item.product_id}:${Number(item.quantity)}:${Number(item.unit_price)}`,
    )
    .join("|");

export function orderInputSignature(input: CreateOrderInput): string {
  return [
    input.client_id,
    input.user_id,
    input.origin,
    normalizedDate(input.delivery_date),
    itemSignature(input.items),
  ].join("::");
}

export function orderSignature(order: Order): string {
  return [
    order.client_id,
    order.user_id,
    order.origin,
    normalizedDate(order.delivery_date),
    itemSignature(order.items ?? []),
  ].join("::");
}
