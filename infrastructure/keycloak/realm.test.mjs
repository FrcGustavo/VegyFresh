import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const realm = JSON.parse(readFileSync(new URL("./realm/vegyfresh-realm.json", import.meta.url), "utf8"));

test("realm defines public authorization code clients with PKCE", () => {
  assert.equal(realm.realm, "vegyfresh");
  assert.equal(realm.enabled, true);
  assert.equal(realm.users?.length ?? 0, 0);
  for (const [id, origin, scopes] of [
    ["vegyfresh-admin", "http://localhost:5173", ["vegyfresh-api"]],
    ["vegyfresh-portal", "http://localhost:5174", ["vegyfresh-api", "vegyfresh-portal"]],
  ]) {
    const client = realm.clients.find((item) => item.clientId === id);
    assert.ok(client, `${id} must exist`);
    assert.equal(client.publicClient, true);
    assert.equal(client.standardFlowEnabled, true);
    assert.equal(client.directAccessGrantsEnabled, false);
    assert.equal(client.implicitFlowEnabled, false);
    assert.equal(client.serviceAccountsEnabled, false);
    assert.equal(client.attributes["pkce.code.challenge.method"], "S256");
    assert.deepEqual(client.redirectUris, [`${origin}/*`]);
    assert.deepEqual(client.webOrigins, [origin]);
    for (const scope of ["basic", "profile", "email"]) assert.ok(client.defaultClientScopes.includes(scope));
    for (const scope of scopes) assert.ok(client.optionalClientScopes.includes(scope));
  }
});

test("access token scopes provide subject and API audience", () => {
  const basic = realm.clientScopes.find((scope) => scope.name === "basic");
  assert.ok(basic?.protocolMappers.some((mapper) =>
    mapper.protocolMapper === "oidc-sub-mapper" && mapper.config["access.token.claim"] === "true",
  ));
  const api = realm.clientScopes.find((scope) => scope.name === "vegyfresh-api");
  assert.ok(api?.protocolMappers.some((mapper) =>
    mapper.protocolMapper === "oidc-audience-mapper" &&
    mapper.config["included.custom.audience"] === "vegyfresh-api" &&
    mapper.config["access.token.claim"] === "true",
  ));
  assert.ok(realm.clientScopes.some((scope) => scope.name === "vegyfresh-portal"));
});
