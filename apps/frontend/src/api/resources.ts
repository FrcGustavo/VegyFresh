import { fetchApi } from "./client";
import type {
  AiInterpretation,
  Client,
  ClientListQuery,
  CollectionResponse,
  CreateAiInput,
  CreateClientInput,
  CreateInventoryAdjustmentInput,
  CreateOrderInput,
  CreateOrganizationInput,
  CreatePriceListInput,
  CreateProductInput,
  CreateProductPriceInput,
  CreatePurchaseInput,
  CreateSupplierInput,
  CreateUserInput,
  CreateWhatsappInput,
  InventoryMovement,
  Order,
  OrderListQuery,
  Organization,
  PriceList,
  PriceListListQuery,
  Product,
  ProductListQuery,
  ProductPrice,
  Purchase,
  Role,
  CreateRoleInput,
  Supplier,
  SupplierListQuery,
  UpdateClientInput,
  UpdateOrderInput,
  UpdateOrganizationInput,
  UpdatePriceListInput,
  UpdateProductInput,
  UpdateProductPriceInput,
  UpdateSupplierInput,
  UpdateUserInput,
  User,
  UserListQuery,
  WhatsappResult,
} from "./types";

type QueryValue = string | number | boolean | null | undefined;

function withQuery(path: string, query?: object): string {
  if (!query) return path;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query) as [string, QueryValue][]) {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  }

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

async function requireBody<T>(request: Promise<T | null>): Promise<T> {
  const body = await request;
  if (body === null) {
    throw new Error("El servidor respondió sin contenido");
  }
  return body;
}

function createCrudApi<
  Resource,
  CreateInput,
  UpdateInput,
  ListQuery extends object,
>(path: string) {
  const getAll = (query?: ListQuery, options?: RequestInit) =>
    requireBody(
      fetchApi<CollectionResponse<Resource>>(withQuery(path, query), options),
    );
  const get = (id: string, options?: RequestInit) =>
    requireBody(fetchApi<Resource>(`${path}/${id}`, options));
  const remove = async (id: string): Promise<void> => {
    await fetchApi(`${path}/${id}`, { method: "DELETE" });
  };

  return {
    getAll,
    get,
    create: (input: CreateInput) =>
      requireBody(
        fetchApi<Resource>(path, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      ),
    update: (id: string, input: UpdateInput) =>
      requireBody(
        fetchApi<Resource>(`${path}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      ),
    remove,
  };
}

export const clientsApi = createCrudApi<
  Client,
  CreateClientInput,
  UpdateClientInput,
  ClientListQuery
>("/clients");

export const usersApi = createCrudApi<
  User,
  CreateUserInput,
  UpdateUserInput,
  UserListQuery
>("/users");

export const rolesApi = {
  getAll: (options?: RequestInit) =>
    requireBody(fetchApi<CollectionResponse<Role>>("/roles", options)),
  create: (input: CreateRoleInput) =>
    requireBody(
      fetchApi<Role>("/roles", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
};

export const suppliersApi = createCrudApi<
  Supplier,
  CreateSupplierInput,
  UpdateSupplierInput,
  SupplierListQuery
>("/suppliers");

export const ordersApi = createCrudApi<
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  OrderListQuery
>("/orders");

export const productsApi = createCrudApi<
  Product,
  CreateProductInput,
  UpdateProductInput,
  ProductListQuery
>("/products");

export const priceListsApi = createCrudApi<
  PriceList,
  CreatePriceListInput,
  UpdatePriceListInput,
  PriceListListQuery
>("/price-lists");

export const productPricesApi = createCrudApi<
  ProductPrice,
  CreateProductPriceInput,
  UpdateProductPriceInput,
  Record<string, never>
>("/product-prices");

export const organizationsApi = {
  create: (input: CreateOrganizationInput) =>
    requireBody(
      fetchApi<Organization>("/organizations", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
  get: (id: string, options?: RequestInit) =>
    requireBody(fetchApi<Organization>(`/organizations/${id}`, options)),
  update: (id: string, input: UpdateOrganizationInput) =>
    requireBody(
      fetchApi<Organization>(`/organizations/${id}`, {
        method: "PATCH",
        body: JSON.stringify(input),
      }),
    ),
};

export const inventoryApi = {
  get: (options?: RequestInit) =>
    requireBody(fetchApi<Product[]>("/inventory", options)),
  getMovements: (options?: RequestInit) =>
    requireBody(
      fetchApi<InventoryMovement[]>("/inventory/movements", options),
    ),
  createAdjustment: (input: CreateInventoryAdjustmentInput) =>
    requireBody(
      fetchApi<InventoryMovement>("/inventory/adjustments", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
};

export const purchasesApi = {
  list: (options?: RequestInit) =>
    requireBody(fetchApi<Purchase[]>("/purchases", options)),
  get: (id: string, options?: RequestInit) =>
    requireBody(fetchApi<Purchase>(`/purchases/${id}`, options)),
  create: (input: CreatePurchaseInput) =>
    requireBody(
      fetchApi<Purchase>("/purchases", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
};

export const aiApi = {
  interpret: (input: CreateAiInput) =>
    requireBody(
      fetchApi<AiInterpretation>("/ai/interpret", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
};

export const whatsappApi = {
  send: (input: CreateWhatsappInput) =>
    requireBody(
      fetchApi<WhatsappResult>("/whatsapp/send", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    ),
};
