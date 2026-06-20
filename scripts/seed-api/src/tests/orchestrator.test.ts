import assert from "node:assert/strict";
import test from "node:test";
import type {
  ApiClient,
  Client,
  Order,
  PriceList,
  Product,
  ProductPrice,
  Purchase,
  Role,
  Supplier,
  User,
} from "@vegyfresh/api-client";
import type { SeedConfig } from "../config/seed-config.js";
import { TARGETS } from "../domain/constants.js";
import { SeedRepository } from "../repositories/seed.repository.js";
import { SeedOrchestrator } from "../services/seed-orchestrator.js";

const now = "2025-01-01T00:00:00.000Z";

class FakeApi {
  private sequence = 0;
  readonly state = {
    roles: [] as Role[],
    users: [] as User[],
    suppliers: [] as Supplier[],
    products: [] as Product[],
    priceLists: [] as PriceList[],
    prices: [] as ProductPrice[],
    clients: [] as Client[],
    purchases: [] as Purchase[],
    orders: [] as Order[],
  };

  private id(prefix: string) {
    this.sequence += 1;
    return `${prefix}-${this.sequence}`;
  }

  readonly roles = {
    getAll: async () => this.state.roles,
    create: async (input: {
      name: string;
      permissions: Record<string, unknown>[];
    }) => {
      const value = { id: this.id("role"), ...input };
      this.state.roles.push(value);
      return value;
    },
  };

  readonly users = {
    getAll: async () => this.state.users,
    create: async (input: { name: string; email: string; role_id: string }) => {
      const value: User = {
        id: this.id("user"),
        folio: "USR",
        name: input.name,
        email: input.email,
        role_id: input.role_id,
        avatar_url: null,
        organization_id: "org",
        created_at: now,
      };
      this.state.users.push(value);
      return value;
    },
    update: async (id: string, input: Partial<User>) =>
      Object.assign(this.state.users.find((value) => value.id === id)!, input),
  };

  readonly suppliers = {
    getAll: async () => this.state.suppliers,
    create: async (input: {
      name: string;
      email?: string | null;
      phone_number?: string | null;
    }) => {
      const value: Supplier = {
        id: this.id("supplier"),
        folio: "SUP",
        name: input.name,
        email: input.email ?? null,
        phone_number: input.phone_number ?? null,
        logo_url: null,
        organization_id: "org",
        createdAt: now,
        updatedAt: now,
      };
      this.state.suppliers.push(value);
      return value;
    },
    update: async (id: string, input: Partial<Supplier>) =>
      Object.assign(
        this.state.suppliers.find((value) => value.id === id)!,
        input,
      ),
  };

  readonly products = {
    getAll: async () => this.state.products,
    create: async (input: {
      name: string;
      description?: string | null;
      supplier_id: string;
      stock: number;
      unit: "kg" | "pz";
      images?: string[];
    }) => {
      const value: Product = {
        id: this.id("product"),
        folio: "PRO",
        name: input.name,
        description: input.description ?? null,
        supplier_id: input.supplier_id,
        organization_id: "org",
        stock: input.stock,
        unit: input.unit,
        images: input.images ?? [],
        createdAt: now,
        updatedAt: now,
      };
      this.state.products.push(value);
      return value;
    },
    update: async (id: string, input: Partial<Product>) =>
      Object.assign(
        this.state.products.find((value) => value.id === id)!,
        input,
      ),
  };

  readonly priceLists = {
    getAll: async () => this.state.priceLists,
    create: async (input: { name: string }) => {
      const value: PriceList = {
        id: this.id("list"),
        name: input.name,
        folio: "LST",
        organization_id: "org",
        createdAt: now,
        updatedAt: now,
      };
      this.state.priceLists.push(value);
      return value;
    },
  };

  readonly productPrices = {
    getAll: async () => this.state.prices,
    create: async (input: {
      product_id: string;
      price_list_id: string;
      price: number;
    }) => {
      const value: ProductPrice = {
        id: this.id("price"),
        ...input,
        organization_id: "org",
        createdAt: now,
        updatedAt: now,
      };
      this.state.prices.push(value);
      return value;
    },
    update: async (id: string, input: Partial<ProductPrice>) =>
      Object.assign(this.state.prices.find((value) => value.id === id)!, input),
  };

  readonly clients = {
    getAll: async () => this.state.clients,
    create: async (input: {
      name: string;
      phone_number: string;
      email?: string | null;
      price_list_id?: string | null;
    }) => {
      const value: Client = {
        id: this.id("client"),
        folio: "CLI",
        name: input.name,
        phone_number: input.phone_number,
        email: input.email ?? null,
        price_list_id: input.price_list_id ?? null,
        country: null,
        state: null,
        city: null,
        postal_code: null,
        address: null,
        suburb: null,
        external_number: null,
        internal_number: null,
        avatar_url: null,
        organization_id: "org",
      };
      this.state.clients.push(value);
      return value;
    },
    update: async (id: string, input: Partial<Client>) =>
      Object.assign(
        this.state.clients.find((value) => value.id === id)!,
        input,
      ),
  };

  readonly purchases = {
    list: async () => this.state.purchases,
    create: async (input: {
      supplier_id: string;
      purchase_date?: string;
      notes?: string | null;
      items: Array<{ product_id: string; quantity: number; unit_cost: number }>;
    }) => {
      const id = this.id("purchase");
      const value: Purchase = {
        id,
        organization_id: "org",
        supplier_id: input.supplier_id,
        user_id: this.state.users[0].id,
        folio: id,
        purchase_date: input.purchase_date ?? now,
        notes: input.notes ?? null,
        created_at: now,
        items: input.items.map((item, index) => ({
          id: `${id}-${index}`,
          purchase_id: id,
          ...item,
          subtotal: item.quantity * item.unit_cost,
        })),
      };
      this.state.purchases.push(value);
      return value;
    },
  };

  readonly orders = {
    getAll: async () => this.state.orders,
    create: async (input: {
      client_id: string;
      user_id: string;
      origin: Order["origin"];
      status?: Order["status"];
      delivery_date?: string;
      items: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
      }>;
    }) => {
      const id = this.id("order");
      const value: Order = {
        id,
        folio: id,
        client_id: input.client_id,
        user_id: input.user_id,
        organization_id: "org",
        total_amount: 0,
        description: null,
        status: input.status ?? "PENDING_REVIEW",
        origin: input.origin,
        delivery_date: input.delivery_date ?? null,
        created_at: now,
        items: input.items.map((item, index) => ({
          id: `${id}-${index}`,
          order_id: id,
          ...item,
          subtotal: item.quantity * item.unit_price,
        })),
      };
      this.state.orders.push(value);
      return value;
    },
  };
}

test("el flujo completo es idempotente y respeta las relaciones", async () => {
  const fake = new FakeApi();
  const config: SeedConfig = {
    baseUrl: "http://test",
    token: "token",
    adminPassword: "admin-password",
    operatorPassword: "operator-password",
    concurrency: 20,
    transactionalConcurrency: 5,
  };
  const orchestrator = new SeedOrchestrator(
    new SeedRepository(fake as unknown as ApiClient),
    config,
  );

  await orchestrator.run();
  const countsAfterFirstRun = Object.fromEntries(
    Object.entries(fake.state).map(([key, values]) => [key, values.length]),
  );
  await orchestrator.run();
  const countsAfterSecondRun = Object.fromEntries(
    Object.entries(fake.state).map(([key, values]) => [key, values.length]),
  );

  assert.deepEqual(countsAfterSecondRun, countsAfterFirstRun);
  assert.equal(fake.state.products.length, TARGETS.products);
  assert.equal(fake.state.prices.length, TARGETS.products * TARGETS.priceLists);
  assert.equal(fake.state.purchases.length, TARGETS.purchases);
  assert.equal(fake.state.orders.length, TARGETS.orders);
  for (const purchase of fake.state.purchases) {
    assert.ok(
      purchase.items?.every(
        (item) =>
          fake.state.products.find((product) => product.id === item.product_id)
            ?.supplier_id === purchase.supplier_id,
      ),
    );
  }
  for (const order of fake.state.orders) {
    const client = fake.state.clients.find(
      (value) => value.id === order.client_id,
    )!;
    assert.ok(
      order.items?.every((item) =>
        fake.state.prices.some(
          (price) =>
            price.product_id === item.product_id &&
            price.price_list_id === client.price_list_id &&
            Number(price.price) === Number(item.unit_price),
        ),
      ),
    );
  }
});
