import type { SeedConfig } from "../config/seed-config.js";
import { PRICE_LISTS, SEED_PREFIX, TARGETS } from "../domain/constants.js";
import { orderInputSignature, orderSignature } from "../domain/models.js";
import { createOrderSeeds } from "../generators/transaction.generators.js";
import type {
  SeedRepository,
  SeedSnapshot,
} from "../repositories/seed.repository.js";
import { logStep } from "../utils/format.js";
import { PricesClientsSeeder } from "./prices-clients.seeder.js";
import { RolesUsersSeeder } from "./roles-users.seeder.js";
import { SuppliersProductsSeeder } from "./suppliers-products.seeder.js";
import { TransactionsSeeder } from "./transactions.seeder.js";

export class SeedOrchestrator {
  constructor(
    private readonly repository: SeedRepository,
    private readonly config: SeedConfig,
  ) {}

  async run() {
    logStep("Cargando estado actual");
    const initial = await this.repository.snapshot();

    logStep("Asegurando roles y 5 usuarios");
    const identity = await new RolesUsersSeeder(
      this.repository,
      this.config,
    ).run(initial.roles, initial.users);

    logStep("Asegurando 50 proveedores y 200 productos");
    const catalog = await new SuppliersProductsSeeder(
      this.repository,
      this.config,
    ).run(initial.suppliers, initial.products);

    logStep("Asegurando 5 listas, 1,000 precios y 50 clientes");
    const commercial = await new PricesClientsSeeder(
      this.repository,
      this.config,
    ).run(
      initial.priceLists,
      initial.prices,
      initial.clients,
      catalog.products,
      catalog.productSeeds,
    );

    const transactionContext: SeedSnapshot = {
      roles: identity.roles,
      users: identity.users,
      suppliers: catalog.suppliers,
      products: catalog.products,
      priceLists: commercial.priceLists,
      prices: commercial.prices,
      clients: commercial.clients,
      purchases: initial.purchases,
      orders: initial.orders,
    };

    logStep("Asegurando 200 compras y 200 pedidos");
    const transactions = await new TransactionsSeeder(
      this.repository,
      this.config,
    ).run(transactionContext);

    logStep("Validando resultado final");
    const finalSnapshot = await this.repository.snapshot();
    const summary = this.validate(finalSnapshot, transactionContext);
    console.log("\n[seed] Seed completado con éxito");
    console.table({ ...summary, ...transactions });
    return summary;
  }

  private validate(snapshot: SeedSnapshot, generated: SeedSnapshot) {
    const generatedProductIds = new Set(
      generated.products.map((value) => value.id),
    );
    const generatedListIds = new Set(
      generated.priceLists.map((value) => value.id),
    );
    const expectedOrderSignatures = new Set(
      createOrderSeeds(generated).map((seed) =>
        orderInputSignature(seed.input),
      ),
    );
    const result = {
      users: snapshot.users.filter((value) => value.email.startsWith("seed."))
        .length,
      suppliers: snapshot.suppliers.filter((value) =>
        value.name.startsWith(SEED_PREFIX),
      ).length,
      products: snapshot.products.filter((value) =>
        value.name.startsWith(SEED_PREFIX),
      ).length,
      priceLists: snapshot.priceLists.filter((value) =>
        PRICE_LISTS.some((list) => list.name === value.name),
      ).length,
      prices: snapshot.prices.filter(
        (value) =>
          generatedProductIds.has(value.product_id) &&
          generatedListIds.has(value.price_list_id),
      ).length,
      clients: snapshot.clients.filter((value) =>
        value.name.startsWith(SEED_PREFIX),
      ).length,
      purchases: snapshot.purchases.filter((value) =>
        value.notes?.startsWith(`${SEED_PREFIX}:PURCHASE:`),
      ).length,
      orders: snapshot.orders.filter((value) =>
        expectedOrderSignatures.has(orderSignature(value)),
      ).length,
    };
    const expected = {
      ...TARGETS,
      prices: TARGETS.products * TARGETS.priceLists,
    };
    for (const [key, target] of Object.entries(expected)) {
      const actual = result[key as keyof typeof result];
      if (actual !== target) {
        throw new Error(
          `Validación fallida para ${key}: esperado ${target}, obtenido ${actual}`,
        );
      }
    }
    return result;
  }
}
