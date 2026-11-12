import assert from "node:assert/strict";
import { createCipheriv, createHash, createSign, generateKeyPairSync } from "node:crypto";
import { createServer } from "node:http";
import test from "node:test";
import {
  createBffProxy,
  createBffProxyCache,
} from "../src/infrastructure/server/proxy.mjs";

const origin = "http://localhost:5173";
const sessionSecret = "test-session-secret-with-at-least-32-bytes";
const paths = {
  "/api/v1/portal/auth/me": { get: {} },
  "/api/private": { get: {}, post: {} },
  "/api/bills/{id}/file": { get: {}, put: {} },
};
const makeRequest = (path, options = {}) => new Request(origin + path, options);

function encodeJwtPart(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signJwt(privateKey, claims) {
  const signingInput = `${encodeJwtPart({ alg: "RS256", kid: "key-1", typ: "JWT" })}.${encodeJwtPart(claims)}`;
  const signature = createSign("RSA-SHA256")
    .update(signingInput)
    .sign(privateKey)
    .toString("base64url");
  return `${signingInput}.${signature}`;
}

async function createIdentityProvider(publicIssuer) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const { privateKey: forgedPrivateKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = {
    ...publicKey.export({ format: "jwk" }),
    kid: "key-1",
    use: "sig",
    alg: "RS256",
  };
  const state = {
    publicClient: false,
    discoveryCalls: 0,
    tokenCalls: 0,
    authorization: undefined,
    nextAccessToken: "access-good",
    nextRefreshToken: "refresh-good",
    refreshError: undefined,
    discoveryStatus: 200,
    tokenDelayMs: 0,
    idTokenNonceOverride: undefined,
    forgedIdToken: false,
    refreshTokens: new Map(),
  };
  let issuer;
  const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url, `http://${request.headers.host}`);
    if (
      requestUrl.pathname === "/realms/test/.well-known/openid-configuration"
    ) {
      state.discoveryCalls += 1;
      if (state.discoveryStatus !== 200) {
        response
          .writeHead(state.discoveryStatus, {
            "content-type": "application/json",
          })
          .end("{}");
        return;
      }
      response.writeHead(200, { "content-type": "application/json" }).end(
        JSON.stringify({
          issuer,
          authorization_endpoint: `${issuer}/protocol/openid-connect/auth`,
          token_endpoint: `${issuer}/protocol/openid-connect/token`,
          jwks_uri: `${issuer}/protocol/openid-connect/certs`,
          end_session_endpoint: `${issuer}/protocol/openid-connect/logout`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code", "refresh_token"],
          token_endpoint_auth_methods_supported: ["client_secret_post", "none"],
          id_token_signing_alg_values_supported: ["RS256"],
          code_challenge_methods_supported: ["S256"],
        }),
      );
      return;
    }
    if (requestUrl.pathname === "/realms/test/protocol/openid-connect/certs") {
      response
        .writeHead(200, { "content-type": "application/json" })
        .end(JSON.stringify({ keys: [jwk] }));
      return;
    }
    if (
      requestUrl.pathname === "/realms/test/protocol/openid-connect/token" &&
      request.method === "POST"
    ) {
      let body = "";
      for await (const chunk of request) body += chunk;
      const parameters = new URLSearchParams(body);
      state.tokenCalls += 1;
      state.lastGrantType = parameters.get("grant_type");
      state.lastRefreshToken = parameters.get("refresh_token");
      assert.equal(parameters.get("client_id"), "vegyfresh-portal");
      assert.equal(
        parameters.get("client_secret"),
        state.publicClient ? null : "server-only-client-secret",
      );
      if (state.tokenDelayMs)
        await new Promise((resolve) => setTimeout(resolve, state.tokenDelayMs));
      if (parameters.get("grant_type") === "authorization_code") {
        assert.equal(
          parameters.get("code_verifier") &&
            createHash("sha256")
              .update(parameters.get("code_verifier"))
              .digest("base64url"),
          state.authorization?.code_challenge,
        );
        const now = Math.floor(Date.now() / 1000);
        const idToken = signJwt(
          state.forgedIdToken ? forgedPrivateKey : privateKey,
          {
            iss: issuer,
            sub: "keycloak-user-1",
            aud: "vegyfresh-portal",
            iat: now,
            exp: now + 300,
            nonce: state.idTokenNonceOverride ?? state.authorization?.nonce,
          },
        );
        response.writeHead(200, { "content-type": "application/json" }).end(
          JSON.stringify({
            access_token: state.nextAccessToken,
            refresh_token: state.nextRefreshToken,
            id_token: idToken,
            token_type: "Bearer",
            expires_in: 300,
            refresh_expires_in: 3600,
          }),
        );
        return;
      }
      if (parameters.get("grant_type") === "refresh_token") {
        if (
          state.refreshError === "outage" ||
          parameters.get("refresh_token") === "refresh-outage"
        ) {
          response
            .writeHead(503, { "content-type": "application/json" })
            .end(JSON.stringify({ error: "temporarily_unavailable" }));
          return;
        }
        if (
          state.refreshError === "invalid" ||
          parameters.get("refresh_token") === "refresh-invalid"
        ) {
          response
            .writeHead(400, { "content-type": "application/json" })
            .end(JSON.stringify({ error: "invalid_grant" }));
          return;
        }
        const refreshResult = state.refreshTokens.get(
          parameters.get("refresh_token"),
        ) ?? {
          access_token: "access-refreshed",
          refresh_token: state.nextRefreshToken,
        };
        response.writeHead(200, { "content-type": "application/json" }).end(
          JSON.stringify({
            ...refreshResult,
            token_type: "Bearer",
            expires_in: 300,
            refresh_expires_in: 3600,
          }),
        );
        return;
      }
      response
        .writeHead(400, { "content-type": "application/json" })
        .end(JSON.stringify({ error: "unsupported_grant_type" }));
      return;
    }
    response.writeHead(404).end();
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const internalIssuerUrl = `http://127.0.0.1:${server.address().port}/realms/test`;
  issuer = publicIssuer ?? internalIssuerUrl;
  return {
    issuer,
    internalIssuerUrl,
    state,
    async close() {
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

function makeProxy(
  provider,
  fetchImpl = async () => Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } }),
  overrides = {},
) {
  return createBffProxy({
    apiBaseUrl: "http://backend.internal",
    openapiPaths: paths,
    fetchImpl,
    publicOrigin: origin,
    issuer: provider.issuer,
    clientId: "vegyfresh-portal",
    clientSecret: "server-only-client-secret",
    sessionSecret,
    ...overrides,
  });
}

function cookiePairs(response) {
  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1)[0]);
}

function cookieHeader(pairs) {
  return pairs.join("; ");
}

function getPair(pairs, name) {
  return pairs.find((pair) => pair.startsWith(`${name}=`));
}

test("API proxy rejects noncanonical request origins and oversized bodies before backend I/O", async () => {
  let calls = 0;
  const api = createBffProxy({
    apiBaseUrl: "http://backend.internal",
    openapiPaths: paths,
    publicOrigin: origin,
    issuer: "http://127.0.0.1:9/realms/test",
    clientId: "vegyfresh-portal",
    sessionSecret,
    fetchImpl: async () => {
      calls += 1;
      return Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } });
    },
  });

  const crossOrigin = await api.handle(
    new Request("https://attacker.example/api/private"),
  );
  const oversized = await api.handle(
    makeRequest("/api/private", {
      method: "POST",
      headers: { origin, "content-type": "application/octet-stream" },
      body: Buffer.alloc(1_048_577),
    }),
  );
  assert.equal(crossOrigin.status, 400);
  assert.equal(oversized.status, 413);
  assert.equal(calls, 0);
});

async function startLogin(proxy, provider, path = "/session/login") {
  const response = await proxy.handle(makeRequest(path));
  assert.equal(response.status, 303);
  const authorization = new URL(response.headers.get("location"));
  provider.state.authorization = {
    state: authorization.searchParams.get("state"),
    nonce: authorization.searchParams.get("nonce"),
    code_challenge: authorization.searchParams.get("code_challenge"),
  };
  return { response, authorization, cookies: cookiePairs(response) };
}

async function finishLogin(
  proxy,
  provider,
  login,
  state = login.authorization.searchParams.get("state"),
) {
  const callbackUrl = `${origin}/session/callback?code=single-use-code&state=${encodeURIComponent(state)}`;
  const callback = await proxy.handle(
    new Request(callbackUrl, {
      headers: {
        cookie: cookieHeader([
          getPair(login.cookies, "vegyfresh_portal_oidc_transaction"),
        ]),
      },
    }),
  );
  return { callback, cookies: cookiePairs(callback) };
}

function backend(fetchBehavior = () => Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } })) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.headers.get("cookie"), null);
    assert.equal(
      options.headers.get("authorization")?.startsWith("Bearer "),
      Boolean(options.headers.get("authorization")),
    );
    return fetchBehavior(url, options);
  };
  return { calls, fetchImpl };
}

test("discovery is lazy for anonymous SSR and a cached proxy factory reuses per-process state", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  assert.deepEqual(await api.getSession({ cookieHeader: "", origin }), {
    authenticated: false,
    cookies: [],
  });
  assert.equal(provider.state.discoveryCalls, 0);

  const cache = createBffProxyCache();
  const first = cache("same-config-hash", {
    apiBaseUrl: "http://backend.internal",
    openapiPaths: paths,
    publicOrigin: origin,
    issuer: provider.issuer,
    clientId: "vegyfresh-portal",
    clientSecret: "server-only-client-secret",
    sessionSecret,
  });
  const second = cache("same-config-hash", {
    apiBaseUrl: "http://backend.internal",
    openapiPaths: paths,
    publicOrigin: origin,
    issuer: provider.issuer,
    clientId: "vegyfresh-portal",
    clientSecret: "server-only-client-secret",
    sessionSecret,
  });
  assert.strictEqual(first, second);
});

test("login uses state, nonce, S256 PKCE, canonical callback URL, and sealed host-only cookies", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const login = await startLogin(api, provider);
  assert.equal(login.authorization.origin, new URL(provider.issuer).origin);
  assert.equal(
    login.authorization.pathname,
    "/realms/test/protocol/openid-connect/auth",
  );
  assert.equal(
    login.authorization.searchParams.get("client_id"),
    "vegyfresh-portal",
  );
  assert.equal(
    login.authorization.searchParams.get("redirect_uri"),
    `${origin}/session/callback`,
  );
  assert.equal(
    login.authorization.searchParams.get("scope"),
    "openid profile email vegyfresh-api vegyfresh-portal",
  );
  assert.equal(
    login.authorization.searchParams.get("code_challenge_method"),
    "S256",
  );
  assert.ok(login.authorization.searchParams.get("state"));
  assert.ok(login.authorization.searchParams.get("nonce"));
  assert.ok(login.authorization.searchParams.get("code_challenge"));
  const transaction = getPair(
    login.cookies,
    "vegyfresh_portal_oidc_transaction",
  );
  assert.match(transaction, /^vegyfresh_portal_oidc_transaction=v1\./);
  assert.ok(login.cookies.every((cookie) => !cookie.includes("Domain=")));
  assert.ok(
    login.response.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.startsWith("vegyfresh_portal_oidc_transaction=") &&
          /HttpOnly/i.test(cookie) &&
          /SameSite=Lax/i.test(cookie) &&
          /Max-Age=600/i.test(cookie),
      ),
  );
  assert.ok(login.cookies.some((cookie) => cookie === "refresh_token="));
});

test("login discovers through the internal URL while preserving the public issuer", async (t) => {
  const provider = await createIdentityProvider(
    "http://localhost:1/realms/test",
  );
  t.after(() => provider.close());
  const api = makeProxy(provider, undefined, {
    internalIssuerUrl: provider.internalIssuerUrl,
  });
  const login = await startLogin(api, provider);
  assert.equal(provider.state.discoveryCalls, 1);
  assert.equal(login.authorization.origin, "http://localhost:1");
  assert.equal(
    login.authorization.pathname,
    "/realms/test/protocol/openid-connect/auth",
  );
});

test("registration redirects to Keycloak registration while keeping the configured callback", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const registration = await startLogin(api, provider, "/session/register");
  assert.equal(
    registration.authorization.pathname,
    "/realms/test/protocol/openid-connect/registrations",
  );
  assert.equal(
    registration.authorization.searchParams.get("redirect_uri"),
    `${origin}/session/callback`,
  );
  assert.equal(
    registration.authorization.searchParams.get("code_challenge_method"),
    "S256",
  );
});

test("callback verifies the real ID token, calls VeGYFresh before setting sealed session cookies, and redirects locally", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const apiFetch = backend();
  const api = makeProxy(provider, apiFetch.fetchImpl);
  const login = await startLogin(api, provider);
  const { callback, cookies } = await finishLogin(api, provider, login);
  assert.equal(callback.status, 303);
  assert.equal(callback.headers.get("location"), "/");
  assert.ok(
    apiFetch.calls.some(
      ({ url, options }) =>
        url.pathname === "/api/v1/portal/auth/me" &&
        options.headers.get("authorization") === "Bearer access-good",
    ),
  );
  assert.deepEqual(
    new Set(cookies.map((pair) => pair.slice(0, pair.indexOf("=")))),
    new Set([
      "vegyfresh_portal_oidc_transaction",
      "refresh_token",
      "vegyfresh_portal_access_token",
      "vegyfresh_portal_refresh_token",
      "vegyfresh_portal_id_token",
    ]),
  );
  const allCookies = cookies.join(";");
  for (const token of ["access-good", "refresh-good"])
    assert.ok(!allCookies.includes(token));
  assert.ok(
    callback.headers.getSetCookie().every((cookie) => /HttpOnly/i.test(cookie)),
  );
  assert.ok(
    callback.headers
      .getSetCookie()
      .every((cookie) => /SameSite=Lax/i.test(cookie)),
  );

  const session = await api.getSession({
    cookieHeader: cookieHeader(
      cookies.filter((cookie) =>
        /^vegyfresh_portal_(?:access|refresh|id)_token=/.test(cookie),
      ),
    ),
    origin,
  });
  assert.equal(session.authenticated, true);
  assert.deepEqual(session.cookies, []);
});

test("callback rejects ID tokens with a mismatched nonce or forged signature before contacting VeGYFresh", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const apiFetch = backend();
  const api = makeProxy(provider, apiFetch.fetchImpl);
  for (const invalid of ["nonce", "signature"]) {
    provider.state.idTokenNonceOverride =
      invalid === "nonce" ? "wrong-nonce" : undefined;
    provider.state.forgedIdToken = invalid === "signature";
    const login = await startLogin(api, provider);
    const { callback } = await finishLogin(api, provider, login);
    assert.equal(
      callback.headers.get("location"),
      "/error?error=authentication_failed",
    );
    assert.equal(apiFetch.calls.length, 0);
  }
});

test("callback accepts only a safe local returnTo and rejects state mismatches before code exchange", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const loginResponse = await api.handle(
    makeRequest("/session/login?returnTo=%2Faccounts%3Ftab%3Dall"),
  );
  const authorization = new URL(loginResponse.headers.get("location"));
  provider.state.authorization = {
    state: authorization.searchParams.get("state"),
    nonce: authorization.searchParams.get("nonce"),
    code_challenge: authorization.searchParams.get("code_challenge"),
  };
  const login = { authorization, cookies: cookiePairs(loginResponse) };
  const good = await finishLogin(api, provider, login);
  assert.equal(good.callback.headers.get("location"), "/accounts?tab=all");

  const mismatchLogin = await startLogin(api, provider);
  const tokenCallsBefore = provider.state.tokenCalls;
  const mismatch = await finishLogin(
    api,
    provider,
    mismatchLogin,
    "different-state",
  );
  assert.equal(
    mismatch.callback.headers.get("location"),
    "/error?error=authentication_failed",
  );
  assert.equal(provider.state.tokenCalls, tokenCallsBefore);

  const unsafe = await api.handle(
    makeRequest("/session/login?returnTo=https%3A%2F%2Fevil.example%2F"),
  );
  assert.equal(
    new URL(unsafe.headers.get("location")).searchParams.get("redirect_uri"),
    `${origin}/session/callback`,
  );
  const unsafeLogin = {
    authorization: new URL(unsafe.headers.get("location")),
    cookies: cookiePairs(unsafe),
  };
  provider.state.authorization = {
    state: unsafeLogin.authorization.searchParams.get("state"),
    nonce: unsafeLogin.authorization.searchParams.get("nonce"),
    code_challenge:
      unsafeLogin.authorization.searchParams.get("code_challenge"),
  };
  assert.equal(
    (await finishLogin(api, provider, unsafeLogin)).callback.headers.get(
      "location",
    ),
    "/",
  );
});

test("callback failure codes are constrained and provider descriptions are never reflected", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const login = await startLogin(api, provider);
  const state = login.authorization.searchParams.get("state");
  const denied = await api.handle(
    new Request(
      `${origin}/session/callback?error=access_denied&state=${state}&error_description=private%20provider%20detail`,
      {
        headers: {
          cookie: cookieHeader([
            getPair(login.cookies, "vegyfresh_portal_oidc_transaction"),
          ]),
        },
      },
    ),
  );
  assert.equal(denied.headers.get("location"), "/error?error=access_denied");

  const unknown = await api.handle(
    new Request(
      `${origin}/session/callback?error=server_secret&state=${state}&error_description=never%20show%20this`,
      {
        headers: {
          cookie: cookieHeader([
            getPair(login.cookies, "vegyfresh_portal_oidc_transaction"),
          ]),
        },
      },
    ),
  );
  assert.equal(
    unknown.headers.get("location"),
    "/error?error=authentication_failed",
  );
  assert.ok(!unknown.headers.get("location").includes("never"));
});

test("tampered session cookies are rejected and expired instead of being forwarded", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const apiFetch = backend();
  const api = makeProxy(provider, apiFetch.fetchImpl);
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  const accessPair = getPair(cookies, "vegyfresh_portal_access_token");
  const [cookieName, sealedValue] = accessPair.split("=");
  const sealedParts = sealedValue.split(".");
  sealedParts[2] = `${sealedParts[2][0] === "a" ? "b" : "a"}${sealedParts[2].slice(1)}`;
  const tamperedAccess = `${cookieName}=${sealedParts.join(".")}`;
  const session = await api.getSession({
    cookieHeader: cookieHeader([tamperedAccess]),
    origin,
  });
  assert.equal(session.authenticated, false);
  assert.ok(session.cookies.every((cookie) => /Max-Age=0/i.test(cookie)));
  assert.equal(apiFetch.calls.length, 1);
});

test("callback maps account linking, incomplete profile, invalid token, and provider outages", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const mappings = [
    [{ status: 403, body: { code: "USER_NOT_LINKED" } }, "account_conflict"],
    [
      { status: 403, body: { code: "USER_PROFILE_INCOMPLETE" } },
      "profile_incomplete",
    ],
    [{ status: 401, body: {} }, "authentication_failed"],
    [{ status: 503, body: {} }, "temporarily_unavailable"],
  ];
  for (const [backendResult, expected] of mappings) {
    const api = makeProxy(provider, async () =>
      Response.json(backendResult.body, { status: backendResult.status }),
    );
    const login = await startLogin(api, provider);
    const { callback } = await finishLogin(api, provider, login);
    assert.equal(callback.headers.get("location"), `/error?error=${expected}`);
    assert.ok(!callback.headers.get("location").includes("USER_"));
  }

  const networkFailure = makeProxy(provider, async () => {
    throw new Error("offline");
  });
  const networkLogin = await startLogin(networkFailure, provider);
  assert.equal(
    (
      await finishLogin(networkFailure, provider, networkLogin)
    ).callback.headers.get("location"),
    "/error?error=temporarily_unavailable",
  );
});

test("expired OIDC transactions are rejected server-side even when an old cookie is replayed", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const login = await startLogin(api, provider);
  const originalNow = Date.now;
  Date.now = () => originalNow() + 10 * 60 * 1000 + 1;
  try {
    const { callback } = await finishLogin(api, provider, login);
    assert.equal(
      callback.headers.get("location"),
      "/error?error=authentication_failed",
    );
    assert.equal(provider.state.tokenCalls, 0);
  } finally {
    Date.now = originalNow;
  }
});

test("rejects cross-origin logout and unknown API paths before contacting VeGYFresh", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  let calls = 0;
  const api = makeProxy(provider, async () => {
    calls += 1;
    return new Response();
  });
  const forbidden = await api.handle(
    makeRequest("/session/logout", {
      method: "POST",
      headers: { origin: "https://attacker.example" },
    }),
  );
  assert.equal(forbidden.status, 403);
  assert.equal(
    (await api.handle(makeRequest("/api/private-admin"))).status,
    404,
  );
  assert.equal(
    (await api.handle(makeRequest("/api/bills/%2fsecret/file"))).status,
    404,
  );
  assert.equal(calls, 0);
});

test("logout builds a trusted Keycloak end-session URL and clears every session cookie", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  const response = await api.handle(
    makeRequest("/session/logout", {
      method: "POST",
      headers: {
        origin,
        "sec-fetch-site": "same-origin",
        cookie: cookieHeader(cookies),
      },
    }),
  );
  const body = await response.json();
  assert.equal(body.redirectTo, "/session/logout/redirect");
  assert.ok(!JSON.stringify(body).includes("id_token_hint"));
  const hint = response.headers
    .getSetCookie()
    .filter((cookie) => cookie.startsWith("vegyfresh_portal_logout_hint=v1."))
    .at(-1);
  assert.ok(hint);
  const redirect = await api.handle(
    makeRequest(body.redirectTo, {
      headers: { cookie: hint.split(";", 1)[0] },
    }),
  );
  assert.equal(redirect.status, 303);
  assert.equal(redirect.headers.get("referrer-policy"), "no-referrer");
  assert.ok(
    redirect.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.startsWith("vegyfresh_portal_logout_hint=;") &&
          /Max-Age=0/i.test(cookie),
      ),
  );
  const endSession = new URL(redirect.headers.get("location"));
  assert.equal(endSession.origin, new URL(provider.issuer).origin);
  assert.equal(
    endSession.pathname,
    "/realms/test/protocol/openid-connect/logout",
  );
  assert.equal(
    endSession.searchParams.get("post_logout_redirect_uri"),
    `${origin}/`,
  );
  assert.ok(endSession.searchParams.get("id_token_hint"));
  assert.ok(
    response.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.startsWith("refresh_token=;") && /Max-Age=0/i.test(cookie),
      ),
  );
  assert.ok(
    [
      "vegyfresh_portal_access_token",
      "vegyfresh_portal_refresh_token",
      "vegyfresh_portal_id_token",
      "vegyfresh_portal_oidc_transaction",
    ].every((name) =>
      response.headers
        .getSetCookie()
        .some(
          (cookie) =>
            cookie.startsWith(`${name}=;`) && /Max-Age=0/i.test(cookie),
        ),
    ),
  );
});

test("logout falls back locally and clears cookies when Keycloak discovery is unavailable", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const api = makeProxy(provider);
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  provider.state.discoveryStatus = 503;
  const coldApi = makeProxy(provider);
  const response = await coldApi.handle(
    makeRequest("/session/logout", {
      method: "POST",
      headers: { origin, cookie: cookieHeader(cookies) },
    }),
  );
  assert.deepEqual(await response.json(), {
    redirectTo: "/session/logout/redirect",
  });
  const hint = response.headers
    .getSetCookie()
    .filter((cookie) => cookie.startsWith("vegyfresh_portal_logout_hint=v1."))
    .at(-1);
  const redirect = await coldApi.handle(
    makeRequest("/session/logout/redirect", {
      headers: { cookie: hint.split(";", 1)[0] },
    }),
  );
  assert.equal(redirect.headers.get("location"), "/login");
  assert.ok(
    redirect.headers
      .getSetCookie()
      .some(
        (cookie) =>
          cookie.startsWith("vegyfresh_portal_logout_hint=;") &&
          /Max-Age=0/i.test(cookie),
      ),
  );
});

test("forwards only bearer credentials and preserves binary downloads without caching", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const bytes = new Uint8Array([0, 255, 42, 128]);
  const api = makeProxy(provider, async (url, options) => {
    if (url.pathname === "/api/v1/portal/auth/me")
      return Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } });
    assert.equal(options.headers.get("authorization"), "Bearer access-good");
    assert.equal(options.headers.get("cookie"), null);
    assert.equal(options.headers.get("x-untrusted"), null);
    return new Response(bytes, {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'attachment; filename="bill.pdf"',
        "cache-control": "public, max-age=3600",
      },
    });
  });
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  const response = await api.handle(
    makeRequest("/api/bills/bill-a/file", {
      headers: {
        cookie: cookieHeader(cookies),
        authorization: "Bearer attacker",
        "x-untrusted": "secret",
      },
    }),
  );
  assert.deepEqual(new Uint8Array(await response.arrayBuffer()), bytes);
  assert.equal(
    response.headers.get("content-disposition"),
    'attachment; filename="bill.pdf"',
  );
  assert.match(response.headers.get("cache-control"), /no-store/);
});

test("preserves multipart uploads and never follows backend redirects", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const body = new FormData();
  body.set(
    "file",
    new File([new Uint8Array([1, 2, 3])], "bill.pdf", {
      type: "application/pdf",
    }),
  );
  const api = makeProxy(provider, async (url, options) => {
    if (url.pathname === "/api/bills/bill-a/file") {
      const forwarded = new Request(url, options);
      const file = (await forwarded.formData()).get("file");
      assert.equal(file.name, "bill.pdf");
      assert.deepEqual(
        new Uint8Array(await file.arrayBuffer()),
        new Uint8Array([1, 2, 3]),
      );
      return new Response(null, { status: 204 });
    }
    return new Response(null, {
      status: 302,
      headers: { location: "https://other.example" },
    });
  });
  const upload = await api.handle(
    makeRequest("/api/bills/bill-a/file", {
      method: "PUT",
      headers: { origin },
      body,
    }),
  );
  assert.equal(upload.status, 204);
  const redirect = await api.handle(makeRequest("/api/v1/portal/auth/me"));
  assert.equal(redirect.status, 502);
  assert.equal(redirect.headers.get("location"), null);
});

test("API 401 refresh uses Keycloak once, retries, and persists only sealed rotated tokens", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const apiBackend = backend((url, options) =>
    url.pathname === "/api/v1/portal/auth/me"
      ? Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } })
      : options.headers.get("authorization") === "Bearer access-good"
        ? new Response(null, { status: 401 })
        : Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } }),
  );
  const api = makeProxy(provider, apiBackend.fetchImpl);
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  const response = await api.handle(
    makeRequest("/api/private", { headers: { cookie: cookieHeader(cookies) } }),
  );
  assert.equal(
    response.status,
    200,
    JSON.stringify({
      body: await response.clone().json(),
      tokenCalls: provider.state.tokenCalls,
      lastGrantType: provider.state.lastGrantType,
      lastRefreshToken: provider.state.lastRefreshToken,
    }),
  );
  assert.equal(provider.state.tokenCalls, 2);
  const rotatedCookies = cookiePairs(response);
  assert.ok(
    rotatedCookies.some((cookie) =>
      cookie.startsWith("vegyfresh_portal_access_token=v1."),
    ),
  );
  assert.ok(
    rotatedCookies.some((cookie) =>
      cookie.startsWith("vegyfresh_portal_refresh_token=v1."),
    ),
  );
  assert.ok(
    rotatedCookies.every(
      (cookie) =>
        !cookie.includes("access-refreshed") &&
        !cookie.includes("refresh-good"),
    ),
  );
});

test("SSR refresh invalid_grant clears session; provider/network outages preserve it as unavailable", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  provider.state.nextRefreshToken = "refresh-invalid";
  const api = makeProxy(provider);
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  const refreshOnly = cookieHeader(
    cookies.filter((cookie) =>
      cookie.startsWith("vegyfresh_portal_refresh_token="),
    ),
  );
  const invalid = await api.getSession({ cookieHeader: refreshOnly, origin });
  assert.equal(invalid.authenticated, false);
  assert.equal(invalid.cookies.length, 4);
  assert.ok(invalid.cookies.every((cookie) => /Max-Age=0/i.test(cookie)));

  const outageProvider = await createIdentityProvider();
  t.after(() => outageProvider.close());
  outageProvider.state.nextRefreshToken = "refresh-outage";
  const outageApi = makeProxy(outageProvider);
  const outageLogin = await startLogin(outageApi, outageProvider);
  const outageCookies = (
    await finishLogin(outageApi, outageProvider, outageLogin)
  ).cookies;
  const outageSession = await outageApi.getSession({
    cookieHeader: cookieHeader(
      outageCookies.filter((cookie) =>
        cookie.startsWith("vegyfresh_portal_refresh_token="),
      ),
    ),
    origin,
  });
  assert.equal(outageSession.authenticated, null);
  assert.deepEqual(outageSession.cookies, []);
});

test("concurrent requests share one refresh without forwarding cookie headers", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  provider.state.tokenDelayMs = 25;
  const apiBackend = backend((url, options) =>
    url.pathname === "/api/v1/portal/auth/me"
      ? Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } })
      : options.headers.get("authorization") === "Bearer access-good"
        ? new Response(null, { status: 401 })
        : Response.json({ owner: "current-user" }),
  );
  const api = makeProxy(provider, apiBackend.fetchImpl);
  const login = await startLogin(api, provider);
  const { cookies } = await finishLogin(api, provider, login);
  const [one, two] = await Promise.all([
    api.handle(
      makeRequest("/api/private", {
        headers: { cookie: cookieHeader(cookies) },
      }),
    ),
    api.handle(
      makeRequest("/api/private", {
        headers: { cookie: cookieHeader(cookies) },
      }),
    ),
  ]);
  assert.equal(one.status, 200);
  assert.equal(two.status, 200);
  assert.equal(provider.state.tokenCalls, 2);
});

test("refresh singleflight keeps different users isolated", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  const apiBackend = backend((url, options) => {
    const token = options.headers.get("authorization");
    if (url.pathname === "/api/v1/portal/auth/me")
      return Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } });
    if (token === "Bearer access-old-a" || token === "Bearer access-old-b")
      return new Response(null, { status: 401 });
    if (token === "Bearer access-refreshed-a")
      return Response.json({ owner: "user-a" });
    if (token === "Bearer access-refreshed-b")
      return Response.json({ owner: "user-b" });
    return new Response(null, { status: 401 });
  });
  const api = makeProxy(provider, apiBackend.fetchImpl);
  provider.state.nextAccessToken = "access-old-a";
  provider.state.nextRefreshToken = "refresh-a";
  const loginA = await startLogin(api, provider);
  const cookiesA = (await finishLogin(api, provider, loginA)).cookies;
  provider.state.nextAccessToken = "access-old-b";
  provider.state.nextRefreshToken = "refresh-b";
  const loginB = await startLogin(api, provider);
  const cookiesB = (await finishLogin(api, provider, loginB)).cookies;
  provider.state.refreshTokens.set("refresh-a", {
    access_token: "access-refreshed-a",
    refresh_token: "refresh-a-next",
  });
  provider.state.refreshTokens.set("refresh-b", {
    access_token: "access-refreshed-b",
    refresh_token: "refresh-b-next",
  });

  const [responseA, responseB] = await Promise.all([
    api.handle(
      makeRequest("/api/private", {
        headers: { cookie: cookieHeader(cookiesA) },
      }),
    ),
    api.handle(
      makeRequest("/api/private", {
        headers: { cookie: cookieHeader(cookiesB) },
      }),
    ),
  ]);
  assert.deepEqual(await responseA.json(), { owner: "user-a" });
  assert.deepEqual(await responseB.json(), { owner: "user-b" });
  assert.equal(provider.state.tokenCalls, 4);
});

test("SSR and API preserve a rotated session when VeGYFresh fails after refresh", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  let rejectOriginalAccess = false;
  const apiBackend = backend((url, options) => {
    const token = options.headers.get("authorization");
    if (
      rejectOriginalAccess &&
      url.pathname === "/api/v1/portal/auth/me" &&
      token === "Bearer access-good"
    )
      return new Response(null, { status: 401 });
    if (token === "Bearer access-refreshed")
      throw new Error("backend offline after refresh");
    if (url.pathname === "/api/v1/portal/auth/me")
      return Response.json({ client: { id: "client-1", name: "Client", email: null, portalEnabled: true } });
    return new Response(null, { status: 401 });
  });
  const api = makeProxy(provider, apiBackend.fetchImpl);
  const login = await startLogin(api, provider);
  const cookies = (await finishLogin(api, provider, login)).cookies;
  const sessionCookies = cookieHeader(
    cookies.filter((cookie) =>
      /^vegyfresh_portal_(?:access|refresh|id)_token=/.test(cookie),
    ),
  );
  rejectOriginalAccess = true;

  const session = await api.getSession({
    cookieHeader: sessionCookies,
    origin,
  });
  assert.equal(session.authenticated, null);
  assert.ok(
    session.cookies.some((cookie) =>
      cookie.startsWith("vegyfresh_portal_access_token=v1."),
    ),
  );
  assert.ok(
    session.cookies.some((cookie) =>
      cookie.startsWith("vegyfresh_portal_refresh_token=v1."),
    ),
  );

  const response = await api.handle(
    makeRequest("/api/private", { headers: { cookie: sessionCookies } }),
  );
  assert.equal(response.status, 503);
  assert.ok(
    response.headers
      .getSetCookie()
      .some((cookie) => cookie.startsWith("vegyfresh_portal_access_token=v1.")),
  );
  assert.ok(
    response.headers
      .getSetCookie()
      .some((cookie) => cookie.startsWith("vegyfresh_portal_refresh_token=v1.")),
  );
});

test("rejects unsafe HTTP issuer and oversized or misconfigured session settings", () => {
  const base = {
    apiBaseUrl: "http://backend.internal",
    openapiPaths: paths,
    publicOrigin: origin,
    issuer: "http://keycloak.internal/realms/test",
    clientId: "vegyfresh-portal",
    clientSecret: "secret",
    sessionSecret,
  };
  assert.throws(() => createBffProxy(base), /HTTPS outside loopback/);
  assert.throws(
    () =>
      createBffProxy({
        ...base,
        issuer: "http://127.0.0.1:8080/realms/test",
        publicOrigin: "http://vegyfresh.example",
      }),
    /HTTPS outside loopback/,
  );
  assert.throws(
    () =>
      createBffProxy({
        ...base,
        issuer: "http://127.0.0.1:8080/realms/test",
        sessionSecret: "short",
      }),
    /32 bytes/,
  );
});

test("public clients complete Authorization Code + PKCE without a client secret", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  provider.state.publicClient = true;
  const api = makeProxy(provider, undefined, { clientSecret: undefined });
  const { callback } = await finishLogin(
    api,
    provider,
    await startLogin(api, provider),
  );
  assert.equal(callback.headers.get("location"), "/");
  assert.ok(
    callback.headers
      .getSetCookie()
      .some((cookie) => cookie.startsWith("vegyfresh_portal_access_token=v1.")),
  );
});

test("portal rejects admin cookies and profile responses and projects only client fields", async (t) => {
  const provider = await createIdentityProvider();
  t.after(() => provider.close());
  let profile = { client: { id: "client-1", name: "Client", email: null, portalEnabled: true, secret: "hidden" }, access_token: "hidden" };
  const api = makeProxy(provider, async () => Response.json(profile));
  const admin = await api.getSession({ cookieHeader: "vegyfresh_admin_access_token=admin-token", origin });
  assert.deepEqual(admin, { authenticated: false, cookies: [] });
  const { cookies } = await finishLogin(api, provider, await startLogin(api, provider));
  const header = cookieHeader(cookies);
  const expected = { client: { id: "client-1", name: "Client", email: null, portalEnabled: true } };
  assert.deepEqual((await api.getSession({ cookieHeader: header, origin })).profile, expected);
  const response = await api.handle(makeRequest("/session", { headers: { cookie: header } }));
  assert.deepEqual(await response.json(), { provider: "keycloak", authenticated: true, ...expected });
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const iv = Buffer.alloc(12, 7);
  const cipher = createCipheriv("aes-256-gcm", createHash("sha256").update(sessionSecret).digest(), iv);
  cipher.setAAD(Buffer.from("vegyfresh-session-v1:admin:vegyfresh_admin_access_token"));
  const ciphertext = Buffer.concat([cipher.update("admin-access-token"), cipher.final()]);
  const sealed = ["v1", iv.toString("base64url"), ciphertext.toString("base64url"), cipher.getAuthTag().toString("base64url")].join(".");
  const renamed = `vegyfresh_portal_access_token=${sealed}`;
  assert.equal((await api.getSession({ cookieHeader: renamed, origin })).authenticated, false);
  profile = { client: { id: "client-1", name: "Client", email: null, portalEnabled: false } };
  assert.equal((await api.getSession({ cookieHeader: header, origin })).authenticated, null);
  profile = { user: { id: "admin" }, role: { name: "admin" } };
  assert.equal((await api.getSession({ cookieHeader: header, origin })).authenticated, null);
  assert.equal((await api.handle(makeRequest("/session", { headers: { cookie: header } }))).status, 503);
  const rejected = await finishLogin(api, provider, await startLogin(api, provider));
  assert.equal(rejected.callback.headers.get("location"), "/error?error=authentication_failed");
  assert.ok(!rejected.cookies.some((cookie) => cookie.startsWith("vegyfresh_portal_access_token=v1.")));
});
