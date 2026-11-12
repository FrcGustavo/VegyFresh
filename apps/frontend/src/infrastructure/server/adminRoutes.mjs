const operations = (...methods) =>
  Object.fromEntries(methods.map((method) => [method, {}]));
const prefix = "/api/v1";
const routes = {};

for (const resource of [
  "clients",
  "users",
  "suppliers",
  "products",
  "price-lists",
  "product-prices",
  "orders",
  "purchases",
]) {
  routes[`${prefix}/${resource}`] = operations("get", "post");
  routes[`${prefix}/${resource}/{id}`] = operations(
    "get",
    "patch",
    "delete",
  );
}

export const adminRoutes = Object.freeze({
  ...routes,
  [`${prefix}/roles`]: operations("get", "post"),
  [`${prefix}/organizations`]: operations("post"),
  [`${prefix}/organizations/{id}`]: operations("get", "patch"),
  [`${prefix}/inventory`]: operations("get"),
  [`${prefix}/inventory/movements`]: operations("get"),
  [`${prefix}/inventory/adjustments`]: operations("post"),
  [`${prefix}/ai/interpret`]: operations("post"),
  [`${prefix}/whatsapp/send`]: operations("post"),
});
