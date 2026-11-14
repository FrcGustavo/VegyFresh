import assert from "node:assert/strict";
import { createSign, generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(resolve));
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(";", 1)[0]);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

test("built Start routes isolate sessions and forward only authorized API calls", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig", alg: "RS256" };
  const authorizations = new Map();
  let refreshCalls = 0;
  let issuer;
  const identity = createServer(async (req, res) => {
    const path = new URL(req.url, issuer).pathname;
    res.setHeader("content-type", "application/json");
    if (path.endsWith("/.well-known/openid-configuration")) return res.end(JSON.stringify({ issuer, authorization_endpoint: `${issuer}/auth`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/certs`, end_session_endpoint: `${issuer}/logout`, response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"], token_endpoint_auth_methods_supported: ["none"], id_token_signing_alg_values_supported: ["RS256"], code_challenge_methods_supported: ["S256"] }));
    if (path.endsWith("/certs")) return res.end(JSON.stringify({ keys: [jwk] }));
    if (path.endsWith("/token")) {
      let body = ""; for await (const chunk of req) body += chunk;
      const params = new URLSearchParams(body);
      if (params.get("grant_type") === "refresh_token") {
        refreshCalls++;
        const name = params.get("refresh_token").replace("refresh-", "");
        return res.end(JSON.stringify({ access_token: `renewed-${name}`, refresh_token: `rotated-${name}`, token_type: "Bearer", expires_in: 300, refresh_expires_in: 3600 }));
      }
      const name = params.get("code");
      const now = Math.floor(Date.now() / 1000);
      const claims = `${encode({ alg: "RS256", kid: "test-key", typ: "JWT" })}.${encode({ iss: issuer, sub: name, aud: "vegyfresh-admin", iat: now, exp: now + 300, nonce: authorizations.get(name) })}`;
      const signature = createSign("RSA-SHA256").update(claims).sign(privateKey).toString("base64url");
      return res.end(JSON.stringify({ access_token: `access-${name}`, refresh_token: `refresh-${name}`, id_token: `${claims}.${signature}`, token_type: "Bearer", expires_in: 300, refresh_expires_in: 3600 }));
    }
    res.statusCode = 404; res.end("{}");
  });
  issuer = `http://127.0.0.1:${await listen(identity)}/realms/test`;
  let apiCalls = 0;
  let requireRenewal = false;
  let unavailable = false;
  let withoutOrganization = false;
  let allowUsers = false;
  const api = createServer((req, res) => {
    apiCalls++;
    if (unavailable) { res.statusCode = 503; return res.end(); }
    const authorization = req.headers.authorization || "";
    if (!/^Bearer (?:access|renewed)-(?:Alice|Bob)$/.test(authorization) || (requireRenewal && authorization === "Bearer access-Alice")) { res.statusCode = 401; return res.end(); }
    const name = authorization.endsWith("Alice") ? "Alice" : "Bob";
    res.setHeader("content-type", "application/json");
    if (req.url.startsWith("/api/v1/auth/me")) return res.end(JSON.stringify({ user: { id: name, name, email: `${name}@example.test`, secret: "do-not-serialize" }, organization: withoutOrganization ? null : { id: name, name: `Org ${name}` }, role: { id: "admin", name: "admin", permissions: allowUsers ? ["users:manage"] : ["users.read"] }, privateToken: "do-not-serialize" }));
    res.end(JSON.stringify({ owner: name, path: req.url }));
  });
  const apiPort = await listen(api);
  const reserved = createServer(); const port = await listen(reserved); await close(reserved);
  const origin = `http://127.0.0.1:${port}`;
  const app = spawn(process.execPath, [".output/server/index.mjs"], { env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", VEGYFRESH_PUBLIC_ORIGIN: origin, VEGYFRESH_API_URL: `http://127.0.0.1:${apiPort}`, KEYCLOAK_ISSUER: issuer, VEGYFRESH_SESSION_SECRET: "test-only-session-secret-with-32-bytes" }, stdio: "ignore" });
  t.after(async () => { app.kill(); await Promise.all([close(identity), close(api)]); });
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try { await fetch(`${origin}/health`); ready = true; } catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  assert.ok(ready, "Start server did not start");
  for (const asset of await readdir(".output/public/assets")) {
    assert.doesNotMatch(await readFile(`.output/public/assets/${asset}`, "utf8"), /VEGYFRESH_SESSION_SECRET|KEYCLOAK_CLIENT_SECRET|access-Alice|refresh-Alice/);
  }
  async function login(name) {
    const start = await fetch(`${origin}/session/login?returnTo=%2F`, { redirect: "manual" });
    assert.equal(start.status, 303);
    const authorize = new URL(start.headers.get("location"));
    authorizations.set(name, authorize.searchParams.get("nonce"));
    const transaction = cookies(start).find((value) => value.startsWith("vegyfresh_admin_oidc_transaction="));
    assert.ok(transaction);
    assert.match(start.headers.getSetCookie().join(" "), /HttpOnly/i);
    const callback = await fetch(`${origin}/session/callback?code=${name}&state=${encodeURIComponent(authorize.searchParams.get("state"))}`, { headers: { cookie: transaction }, redirect: "manual" });
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.get("location"), "/");
    assert.match(callback.headers.getSetCookie().join(" "), /HttpOnly/i);
    return cookies(callback).filter((value) => value.startsWith("vegyfresh_admin_") && !value.startsWith("vegyfresh_admin_oidc_transaction=")).join("; ");
  }
  for (const [path, expected] of [["/login?returnTo=%2Forders", "/session/login?returnTo=%2Forders"], ["/signup", "/session/register"], ["/login?returnTo=https%3A%2F%2Fevil.example", "/session/login"]]) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), expected);
  }
  const error = await fetch(`${origin}/error?error=%3Cscript%3Esecret%3C%2Fscript%3E`);
  const errorHtml = await error.text();
  assert.match(errorHtml, /No fue posible iniciar sesión/);
  assert.doesNotMatch(errorHtml, /<script>secret/);
  const [alice, bob] = await Promise.all([login("Alice"), login("Bob")]);
  const [a, b, guest] = await Promise.all([alice, bob, ""].map((cookie) => fetch(`${origin}/orders`, { headers: { cookie }, redirect: "manual" })));
  const [htmlA, htmlB] = await Promise.all([a.text(), b.text()]);
  assert.match(a.headers.get("cache-control"), /private, no-store/);
  assert.match(a.headers.get("vary"), /cookie/i);
  assert.match(htmlA, /Alice@example.test/); assert.doesNotMatch(htmlA, /Bob|access-Alice|refresh-Alice|do-not-serialize/);
  assert.match(htmlB, /Bob@example.test/); assert.doesNotMatch(htmlB, /Alice|access-Bob|refresh-Bob|do-not-serialize/);
  assert.equal(guest.status, 303);
  assert.equal(guest.headers.get("location"), "/login?returnTo=%2Forders");
  assert.equal((await fetch(origin, { headers: { cookie: alice }, redirect: "manual" })).headers.get("location"), "/orders");
  assert.equal((await fetch(`${origin}/users`, { headers: { cookie: alice }, redirect: "manual" })).headers.get("location"), "/orders");
  allowUsers = true;
  assert.equal((await fetch(`${origin}/users`, { headers: { cookie: alice }, redirect: "manual" })).status, 200);
  allowUsers = false;
  withoutOrganization = true;
  assert.equal((await fetch(`${origin}/orders`, { headers: { cookie: alice }, redirect: "manual" })).headers.get("location"), "/organization");
  assert.equal((await fetch(`${origin}/organization`, { headers: { cookie: alice }, redirect: "manual" })).status, 200);
  withoutOrganization = false;
  const session = await fetch(`${origin}/session`, { headers: { cookie: alice } });
  assert.equal((await session.json()).user.name, "Alice");
  const [usersA, usersB, usersGuest] = await Promise.all([alice, bob, ""].map((cookie) => fetch(`${origin}/api/v1/users`, { headers: { cookie, authorization: "Bearer forged" } })));
  assert.equal((await usersA.json()).owner, "Alice"); assert.equal((await usersB.json()).owner, "Bob"); assert.equal(usersGuest.status, 401);
  assert.match(usersA.headers.get("cache-control"), /private, no-store/);
  const before = apiCalls;
  assert.equal((await fetch(`${origin}/api/v1/not-allowed`, { headers: { cookie: alice } })).status, 404);
  assert.equal((await fetch(`${origin}/api/v1/users`, { method: "POST", headers: { cookie: alice, origin: "https://attacker.example" } })).status, 403);
  assert.equal(apiCalls, before);
  requireRenewal = true;
  const renewed = await fetch(`${origin}/orders`, { headers: { cookie: alice } });
  assert.match(await renewed.text(), /Alice/);
  assert.equal(refreshCalls, 1);
  assert.ok(renewed.headers.getSetCookie().some((value) => value.startsWith("vegyfresh_admin_refresh_token=") && /HttpOnly/i.test(value)));
  requireRenewal = false; unavailable = true;
  const failure = await fetch(`${origin}/orders`, { headers: { cookie: bob } });
  assert.equal(failure.status, 503);
  const failureHtml = await failure.text();
  assert.match(failureHtml, /No se pudo verificar tu sesión/);
  assert.match(failureHtml, /Reintentar/);
  unavailable = false;
  const crossOrigin = await fetch(`${origin}/session/logout`, { method: "POST", headers: { cookie: alice, origin: "https://attacker.example" } });
  assert.equal(crossOrigin.status, 403);
  const logout = await fetch(`${origin}/session/logout`, { method: "POST", headers: { cookie: alice, origin } });
  assert.equal(logout.status, 200);
  assert.match(logout.headers.getSetCookie().join(" "), /HttpOnly/i);
});
