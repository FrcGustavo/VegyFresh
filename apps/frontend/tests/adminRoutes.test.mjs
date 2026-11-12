import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { adminRoutes } from "../src/infrastructure/server/adminRoutes.mjs";

const openapi = JSON.parse(
  readFileSync(new URL("../../../clients/api-client/openapi.json", import.meta.url), "utf8"),
);

test("admin BFF allowlist excludes browser credential authentication endpoints", () => {
  for (const path of [
    "/api/v1/auth/login",
    "/api/v1/auth/signup",
    "/api/v1/auth/refresh",
    "/api/v1/auth/logout",
    "/api/v1/auth/me",
  ]) {
    assert.equal(Object.hasOwn(adminRoutes, path), false, path);
  }

  assert.deepEqual(adminRoutes["/api/v1/orders"], { get: {}, post: {} });
});

test("every admin BFF allowlist operation exists in the generated OpenAPI contract", () => {
  for (const [path, operations] of Object.entries(adminRoutes)) {
    for (const method of Object.keys(operations)) {
      assert.ok(openapi.paths[path]?.[method], `${method.toUpperCase()} ${path}`);
    }
  }
});
