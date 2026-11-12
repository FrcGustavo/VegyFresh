const operations = (...methods: string[]) =>
  Object.fromEntries(methods.map((method) => [method, {}]));

const prefix = "/api/v1";

export function portalRoutes() {
  return {
    [`${prefix}/portal/auth/me`]: operations("get"),
    [`${prefix}/portal/orders`]: operations("get"),
    [`${prefix}/portal/orders/{id}`]: operations("get"),
  };
}
