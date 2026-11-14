import assert from "node:assert/strict";
import { generateKeyPairSync, createSign } from "node:crypto";
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readdir, readFile } from "node:fs/promises";
import test from "node:test";

const listen = (server) => new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(resolve));
const cookies = (response) => response.headers.getSetCookie().map((value) => value.split(";", 1)[0]);
const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

// This exercises the built Nitro/Start boundary with a disposable OIDC issuer and API.
test("Start SSR keeps concurrent sessions isolated and completes the OIDC callback", async (t) => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const jwk = { ...publicKey.export({ format: "jwk" }), kid: "test-key", use: "sig", alg: "RS256" };
  const authorizations = new Map();
  let refreshCalls = 0;
  const usedRefreshTokens = new Set();
  let issuer;
  const identity = createServer(async (req, res) => {
    const path = new URL(req.url, issuer).pathname;
    res.setHeader("content-type", "application/json");
    if (path.endsWith("/.well-known/openid-configuration")) return res.end(JSON.stringify({
      issuer, authorization_endpoint: `${issuer}/auth`, token_endpoint: `${issuer}/token`, jwks_uri: `${issuer}/certs`,
      end_session_endpoint: `${issuer}/logout`, response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"], id_token_signing_alg_values_supported: ["RS256"], code_challenge_methods_supported: ["S256"],
    }));
    if (path.endsWith("/certs")) return res.end(JSON.stringify({ keys: [jwk] }));
    if (path.endsWith("/token")) {
      let body = ""; for await (const chunk of req) body += chunk;
      const params = new URLSearchParams(body);
      const identityName = params.get("grant_type") === "refresh_token" ? params.get("refresh_token").replace("refresh-", "") : params.get("code");
      if (params.get("grant_type") === "refresh_token") {
        const token = params.get("refresh_token");
        refreshCalls++;
        if (usedRefreshTokens.has(token)) { res.statusCode = 400; return res.end(JSON.stringify({ error: "invalid_grant" })); }
        usedRefreshTokens.add(token);
        return res.end(JSON.stringify({ access_token: `renewed-${identityName}`, refresh_token: `rotated-${identityName}`, token_type: "Bearer", expires_in: 300, refresh_expires_in: 3600 }));
      }
      const nonce = authorizations.get(identityName);
      const now = Math.floor(Date.now() / 1000);
      const claims = `${encode({ alg: "RS256", kid: "test-key", typ: "JWT" })}.${encode({ iss: issuer, sub: identityName, aud: "vegyfresh-portal", iat: now, exp: now + 300, nonce })}`;
      const signature = createSign("RSA-SHA256").update(claims).sign(privateKey).toString("base64url");
      return res.end(JSON.stringify({ access_token: `access-${identityName}`, refresh_token: `refresh-${identityName}`, id_token: `${claims}.${signature}`, token_type: "Bearer", expires_in: 300, refresh_expires_in: 3600 }));
    }
    res.statusCode = 404; res.end("{}");
  });
  const identityPort = await listen(identity);
  issuer = `http://127.0.0.1:${identityPort}/realms/test`;
  let apiUnavailable = false;
  let apiCalls = 0;
  let requireRenewal = false;
  const api = createServer((req, res) => {
    apiCalls++;
    if (apiUnavailable) { res.statusCode = 503; return res.end(); }
    const authorization = req.headers.authorization || "";
    if (!/^Bearer (?:access|renewed)-(?:Alice|Bob)$/.test(authorization) || (requireRenewal && authorization === "Bearer access-Alice")) { res.statusCode = 401; return res.end(); }
    const name = authorization.endsWith("Alice") ? "Alice" : "Bob";
    res.setHeader("content-type", "application/json");
    if (req.url.startsWith("/api/v1/portal/orders")) {
      const order = { id: "order-1", folio: `ORDER-${name}`, status: "pending", origin: "portal", description: "", delivery_date: "2026-01-01T00:30:00.000Z", created_at: "2026-01-01T00:00:00Z", total_amount: 10, items: [{ id: "item-1", product_id: `PRODUCT-${name}`, quantity: 1, unit_price: 10, subtotal: 10 }] };
      if (req.url.includes("pageSize=50")) return res.end(JSON.stringify([order]));
      if (req.url.endsWith("/order-1")) return res.end(JSON.stringify(order));
      if (req.url.endsWith("/missing")) { res.statusCode = 404; return res.end(JSON.stringify({ message: "private upstream error" })); }
      return res.end(JSON.stringify({ owner: name, path: req.url }));
    }
    res.end(JSON.stringify({ client: { id: name, name, email: null, portalEnabled: true }, privateToken: "do-not-serialize" }));
  });
  const apiPort = await listen(api);
  const reserved = createServer(); const port = await listen(reserved); await close(reserved);
  const origin = `http://127.0.0.1:${port}`;
  const app = spawn(process.execPath, [".output/server/index.mjs"], { env: { ...process.env, PORT: String(port), HOST: "127.0.0.1", VEGYFRESH_PUBLIC_ORIGIN: origin, VEGYFRESH_API_URL: `http://127.0.0.1:${apiPort}`, KEYCLOAK_ISSUER: issuer, VEGYFRESH_SESSION_SECRET: "test-only-session-secret-with-32-bytes" }, stdio: "ignore" });
  t.after(async () => { app.kill(); await Promise.all([close(identity), close(api)]); });
  let ready = false;
  for (let i = 0; i < 100 && !ready; i++) {
    try { await fetch(origin); ready = true; } catch { await new Promise((resolve) => setTimeout(resolve, 50)); }
  }
  assert.ok(ready, "Start server did not start");
  const assets = await readdir(".output/public/assets");
  assert.ok(assets.length, "Start client assets are missing");
  for (const asset of assets) {
    const content = await readFile(`.output/public/assets/${asset}`, "utf8");
    assert.doesNotMatch(content, /VEGYFRESH_SESSION_SECRET|KEYCLOAK_CLIENT_SECRET|portal-access-token|portal-refresh-token/);
  }
  async function login(name) {
    const start = await fetch(`${origin}/session/login?returnTo=%2Fportal%2Fdashboard`, { redirect: "manual" });
    assert.equal(start.status, 303);
    const authorize = new URL(start.headers.get("location"));
    authorizations.set(name, authorize.searchParams.get("nonce"));
    const transaction = cookies(start).find((value) => value.startsWith("vegyfresh_portal_oidc_transaction="));
    assert.ok(transaction);
    assert.match(start.headers.getSetCookie().join(" "), /HttpOnly/i);
    const callback = await fetch(`${origin}/session/callback?code=${name}&state=${encodeURIComponent(authorize.searchParams.get("state"))}`, { headers: { cookie: transaction }, redirect: "manual" });
    assert.equal(callback.status, 303);
    assert.equal(callback.headers.get("location"), "/portal/dashboard");
    const session = cookies(callback).filter((value) => value.startsWith("vegyfresh_portal_") && !value.startsWith("vegyfresh_portal_oidc_transaction="));
    assert.ok(session.length);
    assert.match(callback.headers.getSetCookie().join(" "), /HttpOnly/i);
    return session.join("; ");
  }
  for (const path of ["/login", "/signup", "/register", "/setup-password"]) {
    const response = await fetch(`${origin}${path}`, { redirect: "manual" });
    assert.equal(response.status, 303);
    assert.equal(response.headers.get("location"), "/");
    assert.match(response.headers.get("cache-control"), /private, no-store/);
  }
  const [alice, bob] = await Promise.all([login("Alice"), login("Bob")]);
  const [a, b, guest] = await Promise.all([alice, bob, ""].map((cookie) => fetch(origin, { headers: { cookie } })));
  const [htmlA, htmlB, htmlGuest] = await Promise.all([a.text(), b.text(), guest.text()]);
  assert.equal(a.headers.get("cache-control"), "private, no-store");
  assert.match(a.headers.get("vary"), /cookie/i);
  assert.match(htmlA, /Signed in as (?:<!-- -->)?Alice/); assert.doesNotMatch(htmlA, /Bob|access-Alice|refresh-Alice|do-not-serialize/);
  assert.match(htmlB, /Signed in as (?:<!-- -->)?Bob/); assert.doesNotMatch(htmlB, /Alice|access-Bob|refresh-Bob|do-not-serialize/);
  assert.match(htmlGuest, /Sign in to access/);
  assert.match(htmlGuest, /session\/login\?returnTo=%2Fportal%2Fdashboard/);
  const [dashA, dashB, guestDashboard] = await Promise.all([alice, bob, ""].map((cookie) => fetch(`${origin}/portal/dashboard`, { headers: { cookie }, redirect: "manual" })));
  const [dashboardA, dashboardB] = await Promise.all([dashA.text(), dashB.text()]);
  assert.equal(dashA.status, 200); assert.equal(dashB.status, 200);
  assert.match(dashboardA, /Welcome, (?:<!-- -->)?Alice/); assert.doesNotMatch(dashboardA, /Bob|access-Alice|refresh-Alice|do-not-serialize/);
  assert.match(dashboardB, /Welcome, (?:<!-- -->)?Bob/); assert.doesNotMatch(dashboardB, /Alice|access-Bob|refresh-Bob|do-not-serialize/);
  assert.match(dashA.headers.get("cache-control"), /private, no-store/);
  assert.ok([302, 303, 307].includes(guestDashboard.status));
  assert.equal(guestDashboard.headers.get("location"), "/");
  assert.doesNotMatch(await guestDashboard.text(), /Customer portal dashboard/);
  // Each request renders only its own API-authorized orders into private HTML.
  for (const path of ["/portal/orders", "/portal/orders/order-1"]) {
    const [pageA, pageB, pageGuest] = await Promise.all([alice, bob, ""].map((cookie) => fetch(`${origin}${path}`, { headers: { cookie }, redirect: "manual" })));
    assert.equal(pageA.status, 200); assert.equal(pageB.status, 200);
    assert.match(pageA.headers.get("cache-control"), /private, no-store/);
    const [pageHtmlA, pageHtmlB] = await Promise.all([pageA.text(), pageB.text()]);
    assert.match(pageHtmlA.split("<script")[0], /ORDER-Alice/);
    assert.doesNotMatch(pageHtmlA, /Bob|access-Alice|refresh-Alice|do-not-serialize/);
    assert.match(pageHtmlB.split("<script")[0], /ORDER-Bob/);
    assert.doesNotMatch(pageHtmlB, /Alice|access-Bob|refresh-Bob|do-not-serialize/);
    for (const pair of [...alice.split("; "), ...bob.split("; ")]) {
      const value = pair.slice(pair.indexOf("=") + 1);
      assert.ok(value.length > 10);
      assert.ok(!pageHtmlA.includes(value) && !pageHtmlB.includes(value), "sealed cookie appeared in HTML");
    }
    assert.ok([302, 303, 307].includes(pageGuest.status));
    assert.equal(pageGuest.headers.get("location"), "/");
  }
  const missing = await fetch(`${origin}/portal/orders/missing`, { headers: { cookie: alice } });
  assert.doesNotMatch(await missing.text(), /ORDER-Bob|private upstream error|access-Alice|refresh-Alice/);
  const index = await fetch(`${origin}/portal`, { headers: { cookie: alice }, redirect: "manual" });
  assert.ok([302, 303, 307].includes(index.status));
  assert.equal(index.headers.get("location"), "/portal/dashboard");
  const session = await fetch(`${origin}/session`, { headers: { cookie: alice } });
  assert.deepEqual(await session.json(), { provider: "keycloak", authenticated: true, client: { id: "Alice", name: "Alice", email: null, portalEnabled: true } });
  assert.match(session.headers.get("cache-control"), /private, no-store/);
  const [ordersA, ordersB, guestOrders] = await Promise.all([alice, bob, ""].map((cookie) => fetch(`${origin}/api/v1/portal/orders?page=1`, { headers: { cookie, authorization: "Bearer forged" } })));
  assert.deepEqual(await ordersA.json(), { owner: "Alice", path: "/api/v1/portal/orders?page=1" });
  assert.deepEqual(await ordersB.json(), { owner: "Bob", path: "/api/v1/portal/orders?page=1" });
  assert.equal(guestOrders.status, 401);
  assert.match(ordersA.headers.get("cache-control"), /private, no-store/);
  assert.match(ordersA.headers.get("vary"), /cookie/i);
  const callsBeforeDenied = apiCalls;
  assert.equal((await fetch(`${origin}/api/v1/users`, { headers: { cookie: alice } })).status, 404);
  assert.equal((await fetch(`${origin}/api/v1/portal/orders`, { method: "POST", headers: { cookie: alice, origin: "https://attacker.example" } })).status, 404);
  assert.equal(apiCalls, callsBeforeDenied);
  requireRenewal = true;
  const refreshCallsBeforePage = refreshCalls;
  const renewedPage = await fetch(`${origin}/portal/orders`, { headers: { cookie: alice } });
  assert.match(await renewedPage.text(), /ORDER-Alice/);
  assert.ok(renewedPage.headers.getSetCookie().some((value) => value.startsWith("vegyfresh_portal_refresh_token=") && /HttpOnly/i.test(value)));
  assert.equal(refreshCalls - refreshCallsBeforePage, 1);
  const rotatedCookies = cookies(renewedPage).join("; ");
  const rotatedSession = await fetch(`${origin}/session`, { headers: { cookie: rotatedCookies } });
  assert.equal((await rotatedSession.json()).client.name, "Alice");
  const renewed = await fetch(`${origin}/api/v1/portal/orders`, { headers: { cookie: alice } });
  assert.equal(renewed.status, 200);
  assert.deepEqual(await renewed.json(), { owner: "Alice", path: "/api/v1/portal/orders" });
  assert.ok(renewed.headers.getSetCookie().some((value) => value.startsWith("vegyfresh_portal_access_token=") && /HttpOnly/i.test(value)));
  assert.ok(renewed.headers.getSetCookie().some((value) => value.startsWith("vegyfresh_portal_refresh_token=") && /HttpOnly/i.test(value)));
  requireRenewal = false;
  apiUnavailable = true;
  const unavailable = await fetch(`${origin}/portal/dashboard`, { headers: { cookie: alice }, redirect: "manual" });
  const unavailableHtml = await unavailable.text();
  assert.equal(unavailable.status, 200);
  assert.match(unavailableHtml, /could not check your session/);
  assert.match(unavailableHtml, /Retry/);
  assert.doesNotMatch(unavailableHtml, /Customer portal dashboard|session\/login/);
  apiUnavailable = false;
  const recovered = await fetch(`${origin}/portal/dashboard`, { headers: { cookie: alice } });
  assert.match(await recovered.text(), /Welcome, (?:<!-- -->)?Alice/);
  const crossOrigin = await fetch(`${origin}/session/logout`, { method: "POST", headers: { cookie: alice, origin: "https://attacker.example" } });
  assert.equal(crossOrigin.status, 403);
  const logout = await fetch(`${origin}/session/logout`, { method: "POST", headers: { cookie: alice, origin } });
  assert.equal(logout.status, 200);
  assert.deepEqual(await logout.json(), { redirectTo: "/session/logout/redirect" });
  assert.match(logout.headers.getSetCookie().join(" "), /HttpOnly/i);
});
