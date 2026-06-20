import type { Product, Supplier } from "@vegyfresh/api-client";
import type { SeedConfig } from "../config/seed-config.js";
import {
  createProductSeeds,
  createSupplierSeeds,
} from "../generators/catalog.generators.js";
import type { SeedRepository } from "../repositories/seed.repository.js";
import { mapConcurrent } from "../utils/concurrency.js";

export class SuppliersProductsSeeder {
  constructor(
    private readonly repository: SeedRepository,
    private readonly config: SeedConfig,
  ) {}

  async run(existingSuppliers: Supplier[], existingProducts: Product[]) {
    const supplierByName = new Map(
      existingSuppliers.map((value) => [value.name, value]),
    );
    const supplierSeeds = createSupplierSeeds();
    const suppliers = await mapConcurrent(
      supplierSeeds,
      this.config.concurrency,
      async (seed) => {
        const existing = supplierByName.get(seed.name);
        if (!existing) {
          return this.repository.api.suppliers.create({
            name: seed.name,
            email: seed.email,
            phone_number: seed.phoneNumber,
          });
        }
        if (
          existing.email !== seed.email ||
          existing.phone_number !== seed.phoneNumber
        ) {
          return this.repository.api.suppliers.update(existing.id, {
            email: seed.email,
            phone_number: seed.phoneNumber,
          });
        }
        return existing;
      },
    );

    const supplierByKey = new Map(
      supplierSeeds.map((seed, index) => [seed.key, suppliers[index]]),
    );
    const productByName = new Map(
      existingProducts.map((value) => [value.name, value]),
    );
    const productSeeds = createProductSeeds();
    const products = await mapConcurrent(
      productSeeds,
      this.config.concurrency,
      async (seed) => {
        const supplier = supplierByKey.get(seed.supplierKey);
        if (!supplier)
          throw new Error(`Proveedor faltante: ${seed.supplierKey}`);
        const existing = productByName.get(seed.name);
        if (!existing) {
          return this.repository.api.products.create({
            name: seed.name,
            description: seed.description,
            supplier_id: supplier.id,
            stock: seed.stock,
            unit: seed.unit,
            images: [],
          });
        }
        if (
          existing.description !== seed.description ||
          existing.supplier_id !== supplier.id ||
          existing.unit !== seed.unit
        ) {
          return this.repository.api.products.update(existing.id, {
            description: seed.description,
            supplier_id: supplier.id,
            unit: seed.unit,
          });
        }
        return existing;
      },
    );

    return { suppliers, products, productSeeds };
  }
}
