import {
  getCollectionItems,
  type ApiClient,
  type Client,
  type Order,
  type PriceList,
  type Product,
  type ProductPrice,
  type Purchase,
  type Role,
  type Supplier,
  type User,
} from "@vegyfresh/api-client";
import { ALL_ITEMS_QUERY, ALL_ORDERS_QUERY } from "../domain/constants.js";

export interface SeedSnapshot {
  roles: Role[];
  users: User[];
  suppliers: Supplier[];
  products: Product[];
  priceLists: PriceList[];
  prices: ProductPrice[];
  clients: Client[];
  purchases: Purchase[];
  orders: Order[];
}

export class SeedRepository {
  constructor(readonly api: ApiClient) {}

  async snapshot(): Promise<SeedSnapshot> {
    const [
      roles,
      users,
      suppliers,
      products,
      priceLists,
      prices,
      clients,
      purchases,
      orders,
    ] = await Promise.all([
      this.api.roles.getAll(),
      this.api.users.getAll(ALL_ITEMS_QUERY),
      this.api.suppliers.getAll(ALL_ITEMS_QUERY),
      this.api.products.getAll(ALL_ITEMS_QUERY),
      this.api.priceLists.getAll(ALL_ITEMS_QUERY),
      this.api.productPrices.getAll(),
      this.api.clients.getAll(ALL_ITEMS_QUERY),
      this.api.purchases.list(),
      this.api.orders.getAll(ALL_ORDERS_QUERY),
    ]);

    return {
      roles: getCollectionItems(roles),
      users: getCollectionItems(users),
      suppliers: getCollectionItems(suppliers),
      products: getCollectionItems(products),
      priceLists: getCollectionItems(priceLists),
      prices: getCollectionItems(prices),
      clients: getCollectionItems(clients),
      purchases,
      orders: getCollectionItems(orders),
    };
  }
}
