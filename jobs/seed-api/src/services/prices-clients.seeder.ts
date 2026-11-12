import type {
  Client,
  PriceList,
  Product,
  ProductPrice,
} from "@vegyfresh/api-client";
import type { SeedConfig } from "../config/seed-config.js";
import { PRICE_LISTS } from "../domain/constants.js";
import type { ProductSeed } from "../domain/models.js";
import { createClientSeeds } from "../generators/catalog.generators.js";
import type { SeedRepository } from "../repositories/seed.repository.js";
import { mapConcurrent } from "../utils/concurrency.js";
import { roundCurrency } from "../utils/format.js";

export class PricesClientsSeeder {
  constructor(
    private readonly repository: SeedRepository,
    private readonly config: SeedConfig,
  ) {}

  async run(
    existingLists: PriceList[],
    existingPrices: ProductPrice[],
    existingClients: Client[],
    products: Product[],
    productSeeds: ProductSeed[],
  ) {
    const listByName = new Map(
      existingLists.map((value) => [value.name, value]),
    );
    const priceLists: PriceList[] = [];
    for (const definition of PRICE_LISTS) {
      priceLists.push(
        listByName.get(definition.name) ??
          (await this.repository.api.priceLists.create({
            name: definition.name,
          })),
      );
    }

    const existingPriceByRelation = new Map(
      existingPrices.map((value) => [
        `${value.product_id}:${value.price_list_id}`,
        value,
      ]),
    );
    const priceJobs = productSeeds.flatMap((seed, productIndex) =>
      PRICE_LISTS.map((list, listIndex) => ({
        product: products[productIndex],
        list: priceLists[listIndex],
        price: roundCurrency(seed.basePrice * list.multiplier),
      })),
    );
    const prices = await mapConcurrent(
      priceJobs,
      this.config.concurrency,
      async (job) => {
        const key = `${job.product.id}:${job.list.id}`;
        const existing = existingPriceByRelation.get(key);
        if (!existing) {
          return this.repository.api.productPrices.create({
            product_id: job.product.id,
            price_list_id: job.list.id,
            price: job.price,
          });
        }
        if (Number(existing.price) !== job.price) {
          return this.repository.api.productPrices.update(existing.id, {
            price: job.price,
          });
        }
        return existing;
      },
    );

    const listIdByName = new Map(
      priceLists.map((value) => [value.name, value.id]),
    );
    const existingClientByPhone = new Map(
      existingClients.map((value) => [value.phone_number, value]),
    );
    const clients = await mapConcurrent(
      createClientSeeds(),
      this.config.concurrency,
      async (seed) => {
        const priceListId = listIdByName.get(seed.priceListName);
        if (!priceListId)
          throw new Error(`Lista faltante: ${seed.priceListName}`);
        const existing = existingClientByPhone.get(seed.phoneNumber);
        const payload = {
          name: seed.name,
          phone_number: seed.phoneNumber,
          email: seed.email,
          price_list_id: priceListId,
        };
        if (!existing) return this.repository.api.clients.create(payload);
        if (
          existing.name !== seed.name ||
          existing.email !== seed.email ||
          existing.price_list_id !== priceListId
        ) {
          return this.repository.api.clients.update(existing.id, payload);
        }
        return existing;
      },
    );

    return { priceLists, prices, clients };
  }
}
