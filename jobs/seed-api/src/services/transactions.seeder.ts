import type { Order, Purchase } from "@vegyfresh/api-client";
import type { SeedConfig } from "../config/seed-config.js";
import { orderInputSignature, orderSignature } from "../domain/models.js";
import {
  createOrderSeeds,
  createPurchaseSeeds,
} from "../generators/transaction.generators.js";
import type {
  SeedRepository,
  SeedSnapshot,
} from "../repositories/seed.repository.js";
import { mapConcurrent } from "../utils/concurrency.js";

export class TransactionsSeeder {
  constructor(
    private readonly repository: SeedRepository,
    private readonly config: SeedConfig,
  ) {}

  async run(context: SeedSnapshot) {
    const existingPurchaseMarkers = new Set(
      context.purchases
        .map((purchase) => purchase.notes?.split(" ")[0])
        .filter((value): value is string => Boolean(value)),
    );
    const purchaseSeeds = createPurchaseSeeds(context);
    const purchases = await mapConcurrent(
      purchaseSeeds,
      this.config.transactionalConcurrency,
      async (seed): Promise<Purchase | null> => {
        if (existingPurchaseMarkers.has(seed.marker)) return null;
        try {
          return await this.repository.api.purchases.create(seed.input);
        } catch (error) {
          throw new Error(`Falló ${seed.key}`, { cause: error });
        }
      },
    );

    const existingOrderSignatures = new Set(context.orders.map(orderSignature));
    const orderSeeds = createOrderSeeds(context);
    const orders = await mapConcurrent(
      orderSeeds,
      this.config.transactionalConcurrency,
      async (seed): Promise<Order | null> => {
        if (existingOrderSignatures.has(orderInputSignature(seed.input)))
          return null;
        try {
          return await this.repository.api.orders.create(seed.input);
        } catch (error) {
          throw new Error(`Falló ${seed.key}`, { cause: error });
        }
      },
    );

    return {
      createdPurchases: purchases.filter(Boolean).length,
      createdOrders: orders.filter(Boolean).length,
    };
  }
}
