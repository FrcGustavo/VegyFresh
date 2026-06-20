import assert from "node:assert/strict";
import test from "node:test";
import {
  ApiClientError,
  createApiClient,
  createFetchTransport,
  getCollectionItems,
  withQuery,
  type ApiRequest,
} from "../index.js";

test("serializa queries sin valores vacíos", () => {
  assert.equal(
    withQuery("/products", { search: "tomate", limit: 25, offset: 0, empty: "" }),
    "/products?search=tomate&limit=25&offset=0",
  );
});

test("expone CRUD tipado sobre el transporte inyectado", async () => {
  const calls: Array<{ path: string; options?: RequestInit }> = [];
  const request: ApiRequest = async <Response>(path: string, options?: RequestInit) => {
    calls.push({ path, options });
    return { id: "product-1", name: "Tomate" } as Response;
  };
  const client = createApiClient({ request });

  await client.products.create({
    name: "Tomate",
    supplier_id: "supplier-1",
    unit: "kg",
  });
  await client.products.update("product-1", {
    name: "Tomate saladette",
    unit: "kg",
  });
  await client.products.remove("product-1");

  assert.deepEqual(calls.map((call) => [call.path, call.options?.method]), [
    ["/products", "POST"],
    ["/products/product-1", "PATCH"],
    ["/products/product-1", "DELETE"],
  ]);
});

test("sincroniza altas, cambios y eliminaciones de precios", async () => {
  const calls: string[] = [];
  const request: ApiRequest = async <Response>(path: string, options?: RequestInit) => {
    calls.push(`${options?.method ?? "GET"} ${path}`);
    if (path === "/products/product-1" && options?.method === "PATCH") {
      return { id: "product-1" } as Response;
    }
    return { id: path.split("/").at(-1) ?? "created" } as Response;
  };
  const client = createApiClient({ request });

  await client.workflows.saveProductWithPrices({
    id: "product-1",
    product: { name: "Tomate", supplier_id: "supplier-1", unit: "kg" },
    prices: [
      { price_list_id: "list-1", price: 20 },
      { price_list_id: "list-3", price: 30 },
    ],
    existingPrices: [
      { id: "price-1", price_list_id: "list-1", price: 10 },
      { id: "price-2", price_list_id: "list-2", price: 15 },
    ],
  });

  assert.ok(calls.includes("DELETE /product-prices/price-2"));
  assert.ok(calls.includes("PATCH /product-prices/price-1"));
  assert.ok(calls.includes("POST /product-prices"));
});

test("sincroniza productos al editar una lista de precios", async () => {
  const calls: string[] = [];
  const request: ApiRequest = async <Response>(path: string, options?: RequestInit) => {
    calls.push(`${options?.method ?? "GET"} ${path}`);
    if (path === "/price-lists/list-1" && !options?.method) {
      return {
        id: "list-1",
        name: "Minorista",
        productPrices: [
          { id: "price-1", product_id: "product-1", price: 10 },
          { id: "price-2", product_id: "product-2", price: 15 },
        ],
      } as Response;
    }
    return { id: path.split("/").at(-1) ?? "created" } as Response;
  };
  const client = createApiClient({ request });

  await client.workflows.savePriceListWithProducts({
    id: "list-1",
    name: "Minorista actualizada",
    products: [
      { product_id: "product-1", price: 20 },
      { product_id: "product-3", price: 30 },
    ],
  });

  assert.ok(calls.includes("DELETE /product-prices/price-2"));
  assert.ok(calls.includes("PATCH /product-prices/price-1"));
  assert.ok(calls.includes("POST /product-prices"));
});

test("transporte fetch agrega token y propaga errores del API", async () => {
  const fetchMock: typeof fetch = async (_input, init) => {
    assert.equal(new Headers(init?.headers).get("Authorization"), "Bearer token-1");
    return new Response(JSON.stringify({ message: "No autorizado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  };
  const request = createFetchTransport({
    baseUrl: "http://localhost:3000/",
    token: "token-1",
    fetch: fetchMock,
  });

  await assert.rejects(
    request("/products"),
    (error: unknown) => error instanceof ApiClientError && error.status === 401,
  );
});

test("normaliza colecciones planas y paginadas", () => {
  assert.deepEqual(getCollectionItems([1, 2]), [1, 2]);
  assert.deepEqual(getCollectionItems({ data: [3], total: 1 }), [3]);
});
