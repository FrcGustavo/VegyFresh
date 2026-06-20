import { createApiClient } from "@vegyfresh/api-client";
import { fetchApi } from "./client";

export const apiClient = createApiClient({ request: fetchApi });

export const clientsApi = apiClient.clients;
export const usersApi = apiClient.users;
export const rolesApi = apiClient.roles;
export const suppliersApi = apiClient.suppliers;
export const ordersApi = apiClient.orders;
export const productsApi = apiClient.products;
export const priceListsApi = apiClient.priceLists;
export const productPricesApi = apiClient.productPrices;
export const organizationsApi = apiClient.organizations;
export const inventoryApi = apiClient.inventory;
export const purchasesApi = apiClient.purchases;
export const aiApi = apiClient.ai;
export const whatsappApi = apiClient.whatsapp;
