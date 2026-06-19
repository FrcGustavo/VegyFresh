import type { components, operations } from "./generated/schema";

type EmptyOpenApiObject = Record<string, never>;

type NormalizeOpenApiType<T> = T extends EmptyOpenApiObject
  ? string
  : T extends readonly (infer Item)[]
    ? NormalizeOpenApiType<Item>[]
    : T extends object
      ? { [Key in keyof T]: NormalizeOpenApiType<T[Key]> }
      : T;

type Schema<Name extends keyof components["schemas"]> = NormalizeOpenApiType<
  components["schemas"][Name]
>;

export type CreateClientInput = Schema<"CreateClientDto">;
export type UpdateClientInput = Schema<"UpdateClientDto">;
export type CreateUserInput = Schema<"CreateUserDto">;
export type UpdateUserInput = Schema<"UpdateUserDto">;
export type CreateSupplierInput = Schema<"CreateSupplierDto">;
export type UpdateSupplierInput = Schema<"UpdateSupplierDto">;
export type CreateOrderInput = Schema<"CreateOrderDto">;
export type UpdateOrderInput = Schema<"UpdateOrderDto">;
export type CreateProductInput = Schema<"CreateProductDto">;
export type UpdateProductInput = Schema<"UpdateProductDto">;
export type CreatePriceListInput = Schema<"CreatePriceListDto">;
export type UpdatePriceListInput = Schema<"UpdatePriceListDto">;
export type CreateProductPriceInput = Schema<"CreateProductPriceDto">;
export type UpdateProductPriceInput = Schema<"UpdateProductPriceDto">;
export type CreateOrganizationInput = Schema<"CreateOrganizationDto">;
export type UpdateOrganizationInput = Schema<"UpdateOrganizationDto">;
export type CreateInventoryAdjustmentInput =
  Schema<"CreateInventoryAdjustmentDto">;
export type CreatePurchaseInput = Schema<"CreatePurchaseDto">;
export type CreateAiInput = Schema<"CreateAiDto">;
export type CreateWhatsappInput = Schema<"CreateWhatsappDto">;

export type ClientListQuery = NonNullable<
  operations["ClientsController_findAll"]["parameters"]["query"]
>;
export type UserListQuery = NonNullable<
  operations["UsersController_findAll"]["parameters"]["query"]
>;
export type SupplierListQuery = NonNullable<
  operations["SuppliersController_findAll"]["parameters"]["query"]
>;
export type OrderListQuery = NonNullable<
  operations["OrdersController_findAll"]["parameters"]["query"]
>;
export type ProductListQuery = NonNullable<
  operations["ProductsController_findAll"]["parameters"]["query"]
>;
export type PriceListListQuery = NonNullable<
  operations["PriceListsController_findAll"]["parameters"]["query"]
>;

export type SortOrder = "asc" | "desc";

export interface CollectionPage<Resource> {
  data: Resource[];
  total: number;
}

export type CollectionResponse<Resource> =
  | Resource[]
  | CollectionPage<Resource>;

export interface Client {
  id: string;
  folio: string;
  name: string;
  phone_number: string;
  email: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  postal_code: string | null;
  address: string | null;
  suburb: string | null;
  external_number: string | null;
  internal_number: string | null;
  avatar_url: string | null;
  price_list_id: string | null;
  organization_id: string;
}

export interface User {
  id: string;
  folio: string;
  name: string;
  email: string;
  role_id: string;
  avatar_url: string | null;
  organization_id: string | null;
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  permissions: string[];
}

export interface CreateRoleInput {
  name: string;
  permissions: string[];
}

export interface Supplier {
  id: string;
  folio: string;
  name: string;
  email: string | null;
  phone_number: string | null;
  logo_url: string | null;
  organization_id: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  sku: string;
  folio: string;
  name: string;
  description: string | null;
  supplier_id: string;
  organization_id: string;
  stock: number;
  unit: "kg" | "pz";
  images: string[];
  supplier?: Supplier;
  productPrices?: ProductPrice[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceList {
  id: string;
  name: string;
  folio: string;
  organization_id: string;
  productPrices?: ProductPrice[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  price_list_id: string;
  price: number;
  organization_id: string;
  product?: Product;
  priceList?: PriceList;
  createdAt: string;
  updatedAt: string;
}

export type OrderStatus =
  | "PENDING_REVIEW"
  | "APPROVED"
  | "IN_PROGRESS"
  | "REJECTED"
  | "DELIVERED"
  | "CANCELED";

export type OrderOrigin = "WHATSAPP" | "ADMIN" | "MANUAL" | "PORTAL";

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  product?: Product;
}

export interface Order {
  id: string;
  folio: string;
  client_id: string;
  user_id: string;
  organization_id: string;
  total_amount: number;
  description: string | null;
  status: OrderStatus;
  origin: OrderOrigin;
  delivery_date: string | null;
  created_at: string;
  client?: Client;
  user?: User;
  items?: OrderItem[];
}

export interface Organization {
  id: string;
  folio: string;
  name: string;
  logo_url: string | null;
  legal_name: string | null;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  product_folio_prefix: string | null;
  price_list_folio_prefix: string | null;
  order_folio_prefix: string | null;
  client_folio_prefix: string | null;
  supplier_folio_prefix: string | null;
  purchase_folio_prefix: string | null;
  user_folio_prefix: string | null;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItem {
  id: string;
  purchase_id: string;
  product_id: string;
  quantity: number;
  unit_cost: number;
  subtotal: number;
  product?: Product;
}

export interface Purchase {
  id: string;
  organization_id: string;
  supplier_id: string;
  user_id: string;
  folio: string;
  purchase_date: string;
  notes: string | null;
  created_at: string;
  supplier?: Supplier;
  user?: User;
  items?: PurchaseItem[];
}

export interface InventoryMovement {
  id: string;
  organization_id: string;
  product_id: string;
  user_id: string | null;
  supplier_id: string | null;
  purchase_id: string | null;
  movement_type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: number;
  previous_stock: number;
  new_stock: number;
  reason: string | null;
  created_at: string;
  product?: Product;
  user?: User | null;
  supplier?: Supplier | null;
  purchase?: Purchase | null;
}

export interface AiInterpretation {
  [key: string]: unknown;
}

export interface WhatsappResult {
  [key: string]: unknown;
}
