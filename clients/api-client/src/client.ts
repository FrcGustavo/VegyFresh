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
  CreateRoleInput,
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
  Supplier,
  SupplierListQuery,
  UpdateClientInput,
  UpdateOrderInput,
  UpdateOrganizationInput,
  UpdatePriceListInput,
  UpdateProductInput,
  UpdateProductPriceInput,
  UpdatePurchaseInput,
  UpdateSupplierInput,
  UpdateUserInput,
  User,
  UserListQuery,
  WhatsappResult,
} from "./types.js";
import type { ApiRequest } from "./transport.js";
import { createWorkflows } from "./workflows.js";

type QueryValue = string | number | boolean | null | undefined;

export function withQuery(path: string, query?: object): string {
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

async function requireBody<Response>(request: Promise<Response | null>) {
  const body = await request;
  if (body === null) throw new Error("El servidor respondió sin contenido");
  return body;
}

export interface CrudApi<
  Resource,
  CreateInput,
  UpdateInput,
  ListQuery extends object,
> {
  getAll(
    query?: ListQuery,
    options?: RequestInit,
  ): Promise<CollectionResponse<Resource>>;
  get(id: string, options?: RequestInit): Promise<Resource>;
  create(input: CreateInput): Promise<Resource>;
  update(id: string, input: UpdateInput): Promise<Resource>;
  remove(id: string): Promise<void>;
}

function createCrudApi<
  Resource,
  CreateInput,
  UpdateInput,
  ListQuery extends object,
>(
  request: ApiRequest,
  path: string,
): CrudApi<Resource, CreateInput, UpdateInput, ListQuery> {
  return {
    getAll: (query, options) =>
      requireBody(
        request<CollectionResponse<Resource>>(withQuery(path, query), options),
      ),
    get: (id, options) =>
      requireBody(request<Resource>(`${path}/${id}`, options)),
    create: (input) =>
      requireBody(
        request<Resource>(path, {
          method: "POST",
          body: JSON.stringify(input),
        }),
      ),
    update: (id, input) =>
      requireBody(
        request<Resource>(`${path}/${id}`, {
          method: "PATCH",
          body: JSON.stringify(input),
        }),
      ),
    remove: async (id) => {
      await request(`${path}/${id}`, { method: "DELETE" });
    },
  };
}

export function createApiClient({ request }: { request: ApiRequest }) {
  const clients = createCrudApi<
    Client,
    CreateClientInput,
    UpdateClientInput,
    ClientListQuery
  >(request, "/clients");
  const users = createCrudApi<
    User,
    CreateUserInput,
    UpdateUserInput,
    UserListQuery
  >(request, "/users");
  const suppliers = createCrudApi<
    Supplier,
    CreateSupplierInput,
    UpdateSupplierInput,
    SupplierListQuery
  >(request, "/suppliers");
  const orders = createCrudApi<
    Order,
    CreateOrderInput,
    UpdateOrderInput,
    OrderListQuery
  >(request, "/orders");
  const products = createCrudApi<
    Product,
    CreateProductInput,
    UpdateProductInput,
    ProductListQuery
  >(request, "/products");
  const priceLists = createCrudApi<
    PriceList,
    CreatePriceListInput,
    UpdatePriceListInput,
    PriceListListQuery
  >(request, "/price-lists");
  const productPrices = createCrudApi<
    ProductPrice,
    CreateProductPriceInput,
    UpdateProductPriceInput,
    Record<string, never>
  >(request, "/product-prices");

  const resources = {
    clients,
    users,
    suppliers,
    orders,
    products,
    priceLists,
    productPrices,
    roles: {
      getAll: (options?: RequestInit) =>
        requireBody(request<CollectionResponse<Role>>("/roles", options)),
      create: (input: CreateRoleInput) =>
        requireBody(
          request<Role>("/roles", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
    },
    organizations: {
      create: (input: CreateOrganizationInput) =>
        requireBody(
          request<Organization>("/organizations", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
      get: (id: string, options?: RequestInit) =>
        requireBody(request<Organization>(`/organizations/${id}`, options)),
      update: (id: string, input: UpdateOrganizationInput) =>
        requireBody(
          request<Organization>(`/organizations/${id}`, {
            method: "PATCH",
            body: JSON.stringify(input),
          }),
        ),
    },
    inventory: {
      get: (options?: RequestInit) =>
        requireBody(request<Product[]>("/inventory", options)),
      getMovements: (options?: RequestInit) =>
        requireBody(
          request<InventoryMovement[]>("/inventory/movements", options),
        ),
      createAdjustment: (input: CreateInventoryAdjustmentInput) =>
        requireBody(
          request<InventoryMovement>("/inventory/adjustments", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
    },
    purchases: {
      list: (options?: RequestInit) =>
        requireBody(request<Purchase[]>("/purchases", options)),
      get: (id: string, options?: RequestInit) =>
        requireBody(request<Purchase>(`/purchases/${id}`, options)),
      create: (input: CreatePurchaseInput) =>
        requireBody(
          request<Purchase>("/purchases", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
      update: (id: string, input: UpdatePurchaseInput) =>
        requireBody(
          request<Purchase>(`/purchases/${id}`, {
            method: "PATCH",
            body: JSON.stringify(input),
          }),
        ),
      remove: async (id: string) => {
        await request(`/purchases/${id}`, { method: "DELETE" });
      },
    },
    ai: {
      interpret: (input: CreateAiInput) =>
        requireBody(
          request<AiInterpretation>("/ai/interpret", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
    },
    whatsapp: {
      send: (input: CreateWhatsappInput) =>
        requireBody(
          request<WhatsappResult>("/whatsapp/send", {
            method: "POST",
            body: JSON.stringify(input),
          }),
        ),
    },
  };

  return { ...resources, workflows: createWorkflows(resources) };
}

export type ApiClient = ReturnType<typeof createApiClient>;
