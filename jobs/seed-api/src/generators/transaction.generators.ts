import type {
  Client,
  PriceList,
  Product,
  ProductPrice,
  Supplier,
  User,
} from "@vegyfresh/api-client";
import { SEED_PREFIX, TARGETS } from "../domain/constants.js";
import type { OrderSeed, PurchaseSeed } from "../domain/models.js";
import { pad, roundCurrency, seedDate } from "../utils/format.js";

interface TransactionContext {
  products: Product[];
  suppliers: Supplier[];
  clients: Client[];
  users: User[];
  priceLists: PriceList[];
  prices: ProductPrice[];
}

export function createPurchaseSeeds(
  context: TransactionContext,
): PurchaseSeed[] {
  const productsBySupplier = new Map<string, Product[]>();
  for (const product of context.products) {
    const values = productsBySupplier.get(product.supplier_id) ?? [];
    values.push(product);
    productsBySupplier.set(product.supplier_id, values);
  }

  return Array.from({ length: TARGETS.purchases }, (_, index) => {
    const supplier = context.suppliers[index % context.suppliers.length];
    const supplierProducts = productsBySupplier.get(supplier.id) ?? [];
    if (supplierProducts.length === 0) {
      throw new Error(`El proveedor ${supplier.name} no tiene productos`);
    }
    const itemCount = (index % Math.min(5, supplierProducts.length)) + 1;
    const marker = `${SEED_PREFIX}:PURCHASE:${pad(index + 1)}`;
    return {
      key: `purchase-${pad(index + 1)}`,
      marker,
      input: {
        supplier_id: supplier.id,
        purchase_date: seedDate(index, 9),
        notes: `${marker} Compra determinista para pruebas`,
        items: Array.from({ length: itemCount }, (_, itemIndex) => {
          const product =
            supplierProducts[(index + itemIndex) % supplierProducts.length];
          return {
            product_id: product.id,
            quantity: ((index + itemIndex) % 8) + 1,
            unit_cost: roundCurrency(10 + ((index + itemIndex) % 35) * 1.35),
          };
        }),
      },
    };
  });
}

export function createOrderSeeds(context: TransactionContext): OrderSeed[] {
  const priceListById = new Map(
    context.priceLists.map((value) => [value.id, value]),
  );
  const pricesByList = new Map<string, ProductPrice[]>();
  for (const price of context.prices) {
    const values = pricesByList.get(price.price_list_id) ?? [];
    values.push(price);
    pricesByList.set(price.price_list_id, values);
  }

  return Array.from({ length: TARGETS.orders }, (_, index) => {
    const client = context.clients[index % context.clients.length];
    const user = context.users[index % context.users.length];
    if (!client.price_list_id || !priceListById.has(client.price_list_id)) {
      throw new Error(`El cliente ${client.name} no tiene una lista válida`);
    }
    const availablePrices = pricesByList.get(client.price_list_id) ?? [];
    if (availablePrices.length === 0) {
      throw new Error(`La lista del cliente ${client.name} no tiene precios`);
    }
    const itemCount = (index % 5) + 1;
    return {
      key: `order-${pad(index + 1)}`,
      input: {
        client_id: client.id,
        user_id: user.id,
        origin: "MANUAL",
        status: ["PENDING_REVIEW", "APPROVED", "IN_PROGRESS", "DELIVERED"][
          index % 4
        ] as "PENDING_REVIEW" | "APPROVED" | "IN_PROGRESS" | "DELIVERED",
        delivery_date: seedDate(index, 15),
        items: Array.from({ length: itemCount }, (_, itemIndex) => {
          const price =
            availablePrices[(index * 5 + itemIndex) % availablePrices.length];
          return {
            product_id: price.product_id,
            quantity: ((index + itemIndex) % 6) + 1,
            unit_price: Number(price.price),
          };
        }),
      },
    };
  });
}
