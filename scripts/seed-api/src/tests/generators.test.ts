import assert from "node:assert/strict";
import test from "node:test";
import { PRICE_LISTS, TARGETS } from "../domain/constants.js";
import {
  createClientSeeds,
  createProductSeeds,
  createSupplierSeeds,
  createUserSeeds,
} from "../generators/catalog.generators.js";
import { mapConcurrent } from "../utils/concurrency.js";

test("los generadores de catálogo son deterministas y únicos", () => {
  const suppliers = createSupplierSeeds();
  const products = createProductSeeds();
  const clients = createClientSeeds();
  const users = createUserSeeds("admin-password", "operator-password");

  assert.equal(suppliers.length, TARGETS.suppliers);
  assert.equal(products.length, TARGETS.products);
  assert.equal(clients.length, TARGETS.clients);
  assert.equal(users.length, TARGETS.users);
  assert.equal(
    new Set(products.map((value) => value.name)).size,
    products.length,
  );
  assert.equal(
    new Set(clients.map((value) => value.phoneNumber)).size,
    clients.length,
  );
  assert.deepEqual(products, createProductSeeds());
  for (const priceList of PRICE_LISTS) {
    assert.equal(
      clients.filter((client) => client.priceListName === priceList.name)
        .length,
      10,
    );
  }
});

test("mapConcurrent conserva el orden y limita trabajadores", async () => {
  let active = 0;
  let maximum = 0;
  const result = await mapConcurrent([1, 2, 3, 4, 5], 2, async (value) => {
    active += 1;
    maximum = Math.max(maximum, active);
    await new Promise((resolve) => setTimeout(resolve, 2));
    active -= 1;
    return value * 2;
  });
  assert.deepEqual(result, [2, 4, 6, 8, 10]);
  assert.equal(maximum, 2);
});
