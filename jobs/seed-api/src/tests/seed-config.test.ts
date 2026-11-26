import assert from "node:assert/strict";
import test from "node:test";
import { loadSeedConfig } from "../config/seed-config.js";

test("requires an explicit bearer access token", () => {
  assert.throws(
    () => loadSeedConfig({ SEED_KEYCLOAK_USERNAME: "legacy", SEED_KEYCLOAK_PASSWORD: "legacy" }),
    /SEED_API_BEARER_TOKEN/,
  );
});

test("uses the configured bearer access token", () => {
  const config = loadSeedConfig({
    SEED_API_BEARER_TOKEN: "  development-token  ",
    SEED_API_BASE_URL: "http://localhost:3000/api/v1/",
  });
  assert.equal(config.token, "development-token");
  assert.equal(config.baseUrl, "http://localhost:3000/api/v1");
});
