import {
  createHash,
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { isIP } from "node:net";
import * as oidc from "openid-client";

const OPENAPI_METHODS = new Set([
  "get",
  "head",
  "post",
  "put",
  "patch",
  "delete",
]);
const SAFE_METHODS = new Set(["GET", "HEAD"]);
const OIDC_CALLBACK_PATH = "/session/callback";
const OIDC_LOGOUT_REDIRECT_PATH = "/session/logout/redirect";
const LEGACY_REFRESH_COOKIE = "refresh_token";
const COOKIE_VALUE_LIMIT = 3800;
const COOKIE_HEADER_LIMIT = 16384;
const OIDC_TRANSACTION_TTL_MS = 10 * 60 * 1000;
const RESPONSE_HEADERS = [
  "accept-ranges",
  "cache-control",
  "content-disposition",
  "content-range",
  "content-type",
  "etag",
  "last-modified",
];
const METHODS = new Map([
  ["get", "GET"],
  ["head", "HEAD"],
  ["post", "POST"],
  ["put", "PUT"],
  ["patch", "PATCH"],
  ["delete", "DELETE"],
]);
const INVALID_REFRESH_ERRORS = new Set(["invalid_grant"]);
const REFRESH_REUSE_GRACE_MS = 5000;
const MAX_REFRESHES = 256;
const MAX_REQUEST_BODY_BYTES = 1_048_576;

class CookieSizeError extends Error {}
class RequestBodyTooLargeError extends Error {}

const jsonResponse = (status, message, extraHeaders = {}) =>
  Response.json(
    { statusCode: status, message },
    {
      status,
      headers: {
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
        ...extraHeaders,
      },
    },
  );

function readCookie(header, name) {
  if (!header || header.length > COOKIE_HEADER_LIMIT) return undefined;
  for (const cookie of header.split(";")) {
    const separator = cookie.indexOf("=");
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return cookie.slice(separator + 1).trim();
  }
  return undefined;
}

function routeMatches(template, pathname) {
  const expected = template.split("/");
  const actual = pathname.split("/");
  if (expected.length !== actual.length) return false;
  return expected.every((segment, index) => {
    if (/^\{[^/{}]+\}$/.test(segment)) return actual[index].length > 0;
    return segment === actual[index];
  });
}

async function readBoundedBody(request) {
  if (!request.body) return undefined;
  const declaredLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > MAX_REQUEST_BODY_BYTES
  ) {
    throw new RequestBodyTooLargeError();
  }

  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_REQUEST_BODY_BYTES) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

function tooLargeResponse() {
  return jsonResponse(413, "Request body too large");
}

function isSafeApiPath(pathname) {
  if (
    !pathname.startsWith("/api/") ||
    pathname.includes("//") ||
    pathname.includes("\\")
  )
    return false;
  try {
    return pathname.split("/").every((segment) => {
      const decoded = decodeURIComponent(segment);
      return (
        decoded !== "." &&
        decoded !== ".." &&
        !decoded.includes("/") &&
        !decoded.includes("\\") &&
        !/[\u0000-\u001f]/.test(decoded)
      );
    });
  } catch {
    return false;
  }
}

function allowedMethod(openapiPaths, pathname, method) {
  return Object.entries(openapiPaths).some(([template, operations]) => {
    if (!routeMatches(template, pathname)) return false;
    return Object.keys(operations).some(
      (operation) => METHODS.get(operation.toLowerCase()) === method,
    );
  });
}

function normalizedOrigin(value, label, allowHttpLoopback = false) {
  if (typeof value !== "string" || !value.trim())
    throw new Error(`${label} is required.`);
  const url = new URL(value);
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error(`${label} must be a canonical origin.`);
  }
  if (!["http:", "https:"].includes(url.protocol))
    throw new Error(`${label} must use HTTP or HTTPS.`);
  if (
    url.protocol === "http:" &&
    (!allowHttpLoopback || !isLoopback(url.hostname))
  ) {
    throw new Error(`${label} must use HTTPS outside loopback development.`);
  }
  if (url.origin !== value)
    throw new Error(`${label} must be a canonical origin.`);
  return url.origin;
}

function issuerUrl(value) {
  if (typeof value !== "string" || !value.trim())
    throw new Error("KEYCLOAK_ISSUER is required.");
  const url = new URL(value);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error("KEYCLOAK_ISSUER must be an exact HTTP(S) issuer URL.");
  }
  if (url.protocol === "http:" && !isLoopback(url.hostname)) {
    throw new Error(
      "KEYCLOAK_ISSUER must use HTTPS outside loopback development.",
    );
  }
  if (url.href !== value)
    throw new Error("KEYCLOAK_ISSUER must be an exact issuer URL.");
  return url;
}

function isLoopback(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const version = isIP(host);
  return (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    (version === 4 && host.startsWith("127.")) ||
    (version === 6 && host === "::1")
  );
}

function sessionCipher(secret, namespace) {
  if (typeof secret !== "string" || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error(
      "VEGYFRESH_SESSION_SECRET must contain at least 32 bytes of high-entropy key material.",
    );
  }
  const key = createHash("sha256").update(secret, "utf8").digest();

  return {
    seal(name, value) {
      const iv = randomBytes(12);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      cipher.setAAD(Buffer.from(`vegyfresh-session-v1:${namespace}:${name}`));
      const ciphertext = Buffer.concat([
        cipher.update(value, "utf8"),
        cipher.final(),
      ]);
      const sealed = `v1.${iv.toString("base64url")}.${ciphertext.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}`;
      if (Buffer.byteLength(sealed) > COOKIE_VALUE_LIMIT)
        throw new CookieSizeError();
      return sealed;
    },
    open(name, sealed) {
      if (!sealed || Buffer.byteLength(sealed) > COOKIE_VALUE_LIMIT)
        return undefined;
      const [version, encodedIv, encodedCiphertext, encodedTag, extra] =
        sealed.split(".");
      if (
        version !== "v1" ||
        !encodedIv ||
        !encodedCiphertext ||
        !encodedTag ||
        extra !== undefined
      )
        return undefined;
      if (
        ![encodedIv, encodedCiphertext, encodedTag].every((part) =>
          /^[A-Za-z0-9_-]+$/.test(part),
        )
      )
        return undefined;
      try {
        const iv = Buffer.from(encodedIv, "base64url");
        const tag = Buffer.from(encodedTag, "base64url");
        if (iv.length !== 12 || tag.length !== 16) return undefined;
        const decipher = createDecipheriv("aes-256-gcm", key, iv);
        decipher.setAAD(
          Buffer.from(`vegyfresh-session-v1:${namespace}:${name}`),
        );
        decipher.setAuthTag(tag);
        return Buffer.concat([
          decipher.update(Buffer.from(encodedCiphertext, "base64url")),
          decipher.final(),
        ]).toString("utf8");
      } catch {
        return undefined;
      }
    },
  };
}

function cookieHeader(name, value, origin, maxAge) {
  const secure = new URL(origin).protocol === "https:" ? "; Secure" : "";
  const age = Number.isFinite(maxAge)
    ? `; Max-Age=${Math.max(0, Math.floor(maxAge))}`
    : "";
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax${secure}${age}`;
}

function expiredCookie(name, origin) {
  return cookieHeader(name, "", origin, 0);
}

function cookiePair(header, name) {
  const separator = header.indexOf(";");
  const pair = (separator < 0 ? header : header.slice(0, separator)).trim();
  return pair.startsWith(`${name}=`) ? pair.slice(name.length + 1) : undefined;
}

function responseHeaders(upstream) {
  const headers = new Headers();
  for (const name of RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  headers.set("Cache-Control", "private, no-store");
  headers.set("Vary", "Cookie");
  return headers;
}

function jsonCode(response) {
  return response
    .clone()
    .json()
    .then((body) => {
      if (!body || typeof body !== "object" || Array.isArray(body))
        return undefined;
      return typeof body.code === "string" ? body.code : undefined;
    })
    .catch(() => undefined);
}

function publicProfile(profile) {
  if (!profile || typeof profile !== "object" || Array.isArray(profile))
    return undefined;
  const project = (value, fields) => {
    if (value === null) return null;
    if (!value || typeof value !== "object" || Array.isArray(value))
      return undefined;
    return Object.fromEntries(
      fields
        .filter((field) => Object.hasOwn(value, field))
        .map((field) => [field, value[field]]),
    );
  };
  const result = {};
  if (Object.hasOwn(profile, "user")) {
    result.user = project(profile.user, ["id", "name", "email"]);
  }
  if (Object.hasOwn(profile, "organization")) {
    result.organization = project(profile.organization, [
      "id",
      "name",
      "folio",
    ]);
  }
  if (Object.hasOwn(profile, "role")) {
    result.role = project(profile.role, ["id", "name", "permissions"]);
  }
  return result;
}

function safeReturnTo(value) {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    /%(?:2f|5c)/i.test(value)
  )
    return "/";
  try {
    const url = new URL(value, "https://vegyfresh.invalid");
    if (
      url.origin !== "https://vegyfresh.invalid" ||
      url.pathname === "/api" ||
      url.pathname.startsWith("/api/")
    )
      return "/";
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

function redirectResponse(location, cookies = []) {
  const headers = new Headers({
    Location: location,
    "Cache-Control": "private, no-store",
    Vary: "Cookie",
    "Referrer-Policy": "no-referrer",
  });
  for (const cookie of cookies) headers.append("Set-Cookie", cookie);
  return new Response(null, { status: 303, headers });
}

export function createBffProxy({
  apiBaseUrl,
  openapiPaths,
  fetchImpl = fetch,
  publicOrigin,
  issuer,
  clientId,
  clientSecret,
  sessionSecret,
  internalIssuerUrl,
  application = "admin",
  profilePath = "/api/v1/auth/me",
  scopes = "openid profile email vegyfresh-api",
}) {
  if (!["admin", "portal"].includes(application))
    throw new Error("Invalid BFF application.");
  const cookiePrefix = `vegyfresh_${application}`;
  const LOGOUT_HINT_COOKIE = `${cookiePrefix}_logout_hint`;
  const AUTH_COOKIE_NAMES = [
    "access_token",
    "refresh_token",
    "id_token",
    "oidc_transaction",
  ].map((suffix) => `${cookiePrefix}_${suffix}`);
  const base = new URL(apiBaseUrl);
  if (
    !["http:", "https:"].includes(base.protocol) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  ) {
    throw new Error(
      "VEGYFRESH_API_URL must be an HTTP(S) origin without credentials.",
    );
  }
  const configuredOrigin = normalizedOrigin(
    publicOrigin,
    "VEGYFRESH_PUBLIC_ORIGIN",
    true,
  );
  const issuerBase = issuerUrl(issuer);
  const redirectUri = `${configuredOrigin}${OIDC_CALLBACK_PATH}`;
  const cipher = sessionCipher(sessionSecret, application);
  if (!clientId?.trim()) throw new Error("KEYCLOAK_CLIENT_ID is required.");
  const internalBase = internalIssuerUrl
    ? new URL(internalIssuerUrl)
    : undefined;
  if (
    internalBase &&
    (!["http:", "https:"].includes(internalBase.protocol) ||
      internalBase.username ||
      internalBase.password ||
      internalBase.search ||
      internalBase.hash)
  ) {
    throw new Error(
      "KEYCLOAK_INTERNAL_URL must be an HTTP(S) issuer base without credentials.",
    );
  }
  if (
    internalBase &&
    internalBase.pathname.replace(/\/$/, "") !==
      issuerBase.pathname.replace(/\/$/, "")
  ) {
    throw new Error(
      "KEYCLOAK_INTERNAL_URL must use the same realm path as KEYCLOAK_ISSUER.",
    );
  }
  if (internalBase && !internalBase.pathname.endsWith("/"))
    internalBase.pathname += "/";

  let configPromise;
  const refreshes = new Map();

  async function getOidcConfig() {
    if (!configPromise) {
      configPromise = oidc
        .discovery(issuerBase, clientId, clientSecret, undefined, {
          timeout: 5,
          execute: [
            ...(issuerBase.protocol === "http:"
              ? [oidc.allowInsecureRequests]
              : []),
            oidc.enableNonRepudiationChecks,
          ],
          ...(internalBase
            ? {
                [oidc.customFetch]: async (input, options) => {
                  const target = new URL(input);
                  const issuerPath = issuerBase.pathname.replace(/\/$/, "");
                  if (
                    target.origin !== issuerBase.origin ||
                    (target.pathname !== issuerPath &&
                      !target.pathname.startsWith(`${issuerPath}/`))
                  ) {
                    return fetch(input, options);
                  }
                  const suffix = target.pathname
                    .slice(issuerPath.length)
                    .replace(/^\//, "");
                  const internal = new URL(
                    `${internalBase.pathname}${suffix}`,
                    internalBase.origin,
                  );
                  internal.search = target.search;
                  return fetch(internal, options);
                },
              }
            : {}),
        })
        .catch((error) => {
          configPromise = undefined;
          throw error;
        });
    }
    return configPromise;
  }

  function sealCookie(name, value, origin, maxAge) {
    if (!value) return undefined;
    return cookieHeader(name, cipher.seal(name, value), origin, maxAge);
  }

  function readToken(cookies, name) {
    return cipher.open(name, readCookie(cookies, name));
  }

  function clearSessionCookies(origin, includeLegacy = false) {
    const names = includeLegacy
      ? [...AUTH_COOKIE_NAMES, LOGOUT_HINT_COOKIE, LEGACY_REFRESH_COOKIE]
      : AUTH_COOKIE_NAMES;
    return names.map((name) => expiredCookie(name, origin));
  }

  function sessionCookieHeaders(tokens, origin, fallbackIdToken) {
    const accessMaxAge =
      Number.isFinite(tokens.expires_in) && tokens.expires_in > 0
        ? tokens.expires_in
        : undefined;
    const refreshMaxAge =
      Number.isFinite(tokens.refresh_expires_in) &&
      tokens.refresh_expires_in > 0
        ? tokens.refresh_expires_in
        : 60 * 60 * 24 * 30;
    const idMaxAge =
      Number.isFinite(tokens.id_token_expires_in) &&
      tokens.id_token_expires_in > 0
        ? tokens.id_token_expires_in
        : refreshMaxAge;
    const result = [
      sealCookie(
        `${cookiePrefix}_access_token`,
        tokens.access_token,
        origin,
        accessMaxAge,
      ),
      sealCookie(
        `${cookiePrefix}_refresh_token`,
        tokens.refresh_token,
        origin,
        refreshMaxAge,
      ),
      sealCookie(
        `${cookiePrefix}_id_token`,
        tokens.id_token ?? fallbackIdToken,
        origin,
        idMaxAge,
      ),
    ].filter(Boolean);
    return result;
  }

  function refreshedSessionCookies(
    tokens,
    requestCookies,
    previousRefreshToken,
    origin,
  ) {
    const previousIdToken = readToken(
      requestCookies,
      `${cookiePrefix}_id_token`,
    );
    const cookies = sessionCookieHeaders(tokens, origin, previousIdToken);
    if (!tokens.refresh_token && previousRefreshToken) {
      const preservedRefresh = sealCookie(
        `${cookiePrefix}_refresh_token`,
        previousRefreshToken,
        origin,
        60 * 60 * 24 * 30,
      );
      if (preservedRefresh) cookies.push(preservedRefresh);
    }
    return cookies;
  }

  function unavailableSession(cookies = []) {
    return { authenticated: null, cookies };
  }

  async function callBackend({
    pathname,
    search = "",
    method = "GET",
    body,
    accessToken,
    origin,
    headers,
  }) {
    const target = new URL(pathname + search, base);
    const forwardedHeaders = new Headers();
    for (const name of [
      "accept",
      "accept-language",
      "content-type",
      "if-match",
      "if-none-match",
      "range",
    ]) {
      const value = headers?.get(name);
      if (value) forwardedHeaders.set(name, value);
    }
    forwardedHeaders.set("origin", origin);
    if (accessToken)
      forwardedHeaders.set("authorization", `Bearer ${accessToken}`);
    return fetchImpl(target, {
      method,
      headers: forwardedHeaders,
      body: ["GET", "HEAD"].includes(method) ? undefined : body,
      signal: AbortSignal.timeout(15_000),
      redirect: "manual",
    });
  }

  async function refreshSession(refreshToken) {
    if (!refreshToken) return { kind: "invalid" };
    const key = createHash("sha256").update(refreshToken).digest("base64url");
    const now = Date.now();
    for (const [cachedKey, cached] of refreshes) {
      if (!cached.pending && cached.expiresAt <= now)
        refreshes.delete(cachedKey);
    }
    const cached = refreshes.get(key);
    if (cached && (cached.pending || cached.expiresAt > now))
      return cached.promise;
    if (refreshes.size >= MAX_REFRESHES) return { kind: "unavailable" };

    const entry = { pending: true, expiresAt: 0, promise: undefined };
    entry.promise = getOidcConfig()
      .then((config) => oidc.refreshTokenGrant(config, refreshToken))
      .then((tokens) => ({ kind: "ok", tokens }))
      .catch((error) => ({
        kind:
          error instanceof oidc.ResponseBodyError &&
          INVALID_REFRESH_ERRORS.has(error.error)
            ? "invalid"
            : "unavailable",
      }))
      .then((result) => {
        if (refreshes.get(key) === entry) {
          if (result.kind === "ok") {
            entry.pending = false;
            entry.expiresAt = Date.now() + REFRESH_REUSE_GRACE_MS;
          } else {
            refreshes.delete(key);
          }
        }
        return result;
      });
    refreshes.set(key, entry);
    return entry.promise;
  }

  async function getSession({ cookieHeader: requestCookies, origin }) {
    if (origin !== configuredOrigin)
      return { authenticated: null, cookies: [] };
    let accessToken = readToken(requestCookies, `${cookiePrefix}_access_token`);
    let refreshToken = readToken(
      requestCookies,
      `${cookiePrefix}_refresh_token`,
    );
    const invalidCookies = AUTH_COOKIE_NAMES.filter((name) => {
      const sealed = readCookie(requestCookies, name);
      return sealed !== undefined && cipher.open(name, sealed) === undefined;
    }).map((name) => expiredCookie(name, origin));
    if (!accessToken && !refreshToken) {
      return { authenticated: false, cookies: invalidCookies };
    }

    let rotated;
    if (!accessToken && refreshToken) {
      const result = await refreshSession(refreshToken);
      if (result.kind === "unavailable")
        return { authenticated: null, cookies: invalidCookies };
      if (result.kind === "invalid" || !result.tokens.access_token) {
        return { authenticated: false, cookies: clearSessionCookies(origin) };
      }
      rotated = result.tokens;
      accessToken = rotated.access_token;
      refreshToken = rotated.refresh_token ?? refreshToken;
    }

    let userResponse;
    try {
      userResponse = await callBackend({
        pathname: profilePath,
        accessToken,
        origin,
      });
    } catch {
      if (!rotated) return unavailableSession(invalidCookies);
      try {
        return unavailableSession([
          ...invalidCookies,
          ...refreshedSessionCookies(
            rotated,
            requestCookies,
            refreshToken,
            origin,
          ),
        ]);
      } catch (error) {
        if (!(error instanceof CookieSizeError)) throw error;
        return { authenticated: false, cookies: clearSessionCookies(origin) };
      }
    }
    if (userResponse.status === 401 && refreshToken) {
      const result = await refreshSession(refreshToken);
      if (result.kind === "unavailable")
        return { authenticated: null, cookies: invalidCookies };
      if (result.kind === "invalid" || !result.tokens.access_token) {
        return { authenticated: false, cookies: clearSessionCookies(origin) };
      }
      rotated = result.tokens;
      accessToken = rotated.access_token;
      refreshToken = rotated.refresh_token ?? refreshToken;
      try {
        userResponse = await callBackend({
          pathname: profilePath,
          accessToken,
          origin,
        });
      } catch {
        try {
          return unavailableSession([
            ...invalidCookies,
            ...refreshedSessionCookies(
              rotated,
              requestCookies,
              refreshToken,
              origin,
            ),
          ]);
        } catch (error) {
          if (!(error instanceof CookieSizeError)) throw error;
          return { authenticated: false, cookies: clearSessionCookies(origin) };
        }
      }
    }
    if (userResponse.status >= 500) {
      if (!rotated) return unavailableSession(invalidCookies);
      try {
        return unavailableSession([
          ...invalidCookies,
          ...refreshedSessionCookies(
            rotated,
            requestCookies,
            refreshToken,
            origin,
          ),
        ]);
      } catch (error) {
        if (!(error instanceof CookieSizeError)) throw error;
        return { authenticated: false, cookies: clearSessionCookies(origin) };
      }
    }
    if (userResponse.status === 401)
      return { authenticated: false, cookies: clearSessionCookies(origin) };

    const cookies = [...invalidCookies];
    if (rotated) {
      try {
        cookies.push(
          ...refreshedSessionCookies(
            rotated,
            requestCookies,
            refreshToken,
            origin,
          ),
        );
      } catch (error) {
        if (!(error instanceof CookieSizeError)) throw error;
        return { authenticated: false, cookies: clearSessionCookies(origin) };
      }
    }
    const backendProfile = userResponse.ok
      ? await userResponse.json().catch(() => undefined)
      : undefined;
    if (
      userResponse.ok &&
      (!backendProfile ||
        typeof backendProfile !== "object" ||
        Array.isArray(backendProfile))
    )
      return unavailableSession(cookies);
    return {
      authenticated: userResponse.ok,
      profile: publicProfile(backendProfile),
      cookies,
    };
  }

  async function beginLogin(request, registering = false) {
    const requestUrl = new URL(request.url);
    const returnTo = safeReturnTo(requestUrl.searchParams.get("returnTo"));
    const transaction = {
      state: oidc.randomState(),
      nonce: oidc.randomNonce(),
      verifier: oidc.randomPKCECodeVerifier(),
      returnTo,
      issuedAt: Date.now(),
    };
    try {
      const config = await getOidcConfig();
      const challenge = await oidc.calculatePKCECodeChallenge(
        transaction.verifier,
      );
      const authorization = oidc.buildAuthorizationUrl(config, {
        redirect_uri: redirectUri,
        scope: scopes,
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: challenge,
        code_challenge_method: "S256",
      });
      if (registering) {
        const metadata = config.serverMetadata();
        const trustedAuthEndpoint = new URL(metadata.authorization_endpoint);
        if (!trustedAuthEndpoint.pathname.endsWith("/auth"))
          throw new Error("Keycloak authorization endpoint is invalid.");
        authorization.pathname = trustedAuthEndpoint.pathname.replace(
          /\/auth$/,
          "/registrations",
        );
      }
      const transactionCookie = sealCookie(
        `${cookiePrefix}_oidc_transaction`,
        JSON.stringify(transaction),
        configuredOrigin,
        600,
      );
      if (!transactionCookie)
        throw new Error("OIDC transaction state is invalid.");
      return redirectResponse(authorization.href, [
        transactionCookie,
        expiredCookie(LEGACY_REFRESH_COOKIE, configuredOrigin),
      ]);
    } catch (error) {
      const failure =
        error instanceof CookieSizeError
          ? "authentication_failed"
          : "temporarily_unavailable";
      return redirectResponse(`/error?error=${failure}`, [
        expiredCookie(LEGACY_REFRESH_COOKIE, configuredOrigin),
      ]);
    }
  }

  async function callback(request) {
    const requestUrl = new URL(request.url);
    if (
      requestUrl.origin !== configuredOrigin ||
      requestUrl.pathname !== OIDC_CALLBACK_PATH
    ) {
      return redirectResponse("/error?error=authentication_failed");
    }
    const transactionRaw = readToken(
      request.headers.get("cookie"),
      `${cookiePrefix}_oidc_transaction`,
    );
    let transaction;
    try {
      transaction = transactionRaw ? JSON.parse(transactionRaw) : undefined;
    } catch {
      transaction = undefined;
    }
    const clearTransaction = expiredCookie(
      `${cookiePrefix}_oidc_transaction`,
      configuredOrigin,
    );
    const providerError = requestUrl.searchParams.get("error");
    if (
      !transaction ||
      typeof transaction.state !== "string" ||
      typeof transaction.nonce !== "string" ||
      typeof transaction.verifier !== "string" ||
      !Number.isFinite(transaction.issuedAt) ||
      Date.now() - transaction.issuedAt < 0 ||
      Date.now() - transaction.issuedAt > OIDC_TRANSACTION_TTL_MS
    ) {
      return redirectResponse("/error?error=authentication_failed", [
        clearTransaction,
      ]);
    }
    if (requestUrl.searchParams.get("state") !== transaction.state) {
      return redirectResponse("/error?error=authentication_failed");
    }
    if (providerError) {
      const failure =
        providerError === "access_denied"
          ? "access_denied"
          : "authentication_failed";
      return redirectResponse(`/error?error=${failure}`, [clearTransaction]);
    }

    try {
      const config = await getOidcConfig();
      const canonicalCallback = new URL(redirectUri);
      canonicalCallback.search = requestUrl.search;
      const tokens = await oidc.authorizationCodeGrant(
        config,
        canonicalCallback,
        {
          expectedState: transaction.state,
          expectedNonce: transaction.nonce,
          pkceCodeVerifier: transaction.verifier,
        },
      );
      if (!tokens.access_token || !tokens.id_token) {
        return redirectResponse("/error?error=authentication_failed", [
          clearTransaction,
        ]);
      }
      let userResponse;
      try {
        userResponse = await callBackend({
          pathname: profilePath,
          accessToken: tokens.access_token,
          origin: configuredOrigin,
        });
      } catch {
        return redirectResponse("/error?error=temporarily_unavailable", [
          clearTransaction,
        ]);
      }
      if (userResponse.status === 403) {
        const code = await jsonCode(userResponse);
        const failure =
          code === "USER_NOT_LINKED"
            ? "account_conflict"
            : code === "USER_PROFILE_INCOMPLETE"
              ? "profile_incomplete"
              : "authentication_failed";
        return redirectResponse(`/error?error=${failure}`, [clearTransaction]);
      }
      if (userResponse.status === 401)
        return redirectResponse("/error?error=authentication_failed", [
          clearTransaction,
        ]);
      if (userResponse.status >= 500)
        return redirectResponse("/error?error=temporarily_unavailable", [
          clearTransaction,
        ]);
      if (!userResponse.ok)
        return redirectResponse("/error?error=authentication_failed", [
          clearTransaction,
        ]);

      const cookies = [
        clearTransaction,
        expiredCookie(LEGACY_REFRESH_COOKIE, configuredOrigin),
      ];
      try {
        cookies.push(...sessionCookieHeaders(tokens, configuredOrigin));
      } catch (error) {
        if (!(error instanceof CookieSizeError)) throw error;
        return redirectResponse("/error?error=authentication_failed", [
          ...cookies,
          ...clearSessionCookies(configuredOrigin),
        ]);
      }
      const returnTo = safeReturnTo(transaction.returnTo);
      return redirectResponse(returnTo, cookies);
    } catch (error) {
      const failure =
        error instanceof oidc.AuthorizationResponseError &&
        error.error === "access_denied"
          ? "access_denied"
          : error instanceof oidc.ResponseBodyError &&
              error.error === "temporarily_unavailable"
            ? "temporarily_unavailable"
            : "authentication_failed";
      return redirectResponse(`/error?error=${failure}`, [clearTransaction]);
    }
  }

  async function logout(request) {
    const cookies = clearSessionCookies(configuredOrigin, true);
    const idToken = readToken(
      request.headers.get("cookie"),
      `${cookiePrefix}_id_token`,
    );
    let redirectTo = "/login";
    if (idToken) {
      try {
        const hint = sealCookie(
          LOGOUT_HINT_COOKIE,
          idToken,
          configuredOrigin,
          60,
        );
        if (hint) {
          cookies.push(hint);
          redirectTo = OIDC_LOGOUT_REDIRECT_PATH;
        }
      } catch {
        redirectTo = "/login";
      }
    }
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    });
    for (const cookie of cookies) headers.append("Set-Cookie", cookie);
    return Response.json({ redirectTo }, { headers });
  }

  async function redirectAfterLogout(request) {
    const requestUrl = new URL(request.url);
    const clearHint = expiredCookie(LOGOUT_HINT_COOKIE, configuredOrigin);
    const hint = readToken(request.headers.get("cookie"), LOGOUT_HINT_COOKIE);
    if (requestUrl.origin !== configuredOrigin || !hint)
      return redirectResponse("/login", [clearHint]);
    try {
      const config = await getOidcConfig();
      const metadata = config.serverMetadata();
      if (!metadata.end_session_endpoint)
        return redirectResponse("/login", [clearHint]);
      const endSession = oidc.buildEndSessionUrl(config, {
        id_token_hint: hint,
        post_logout_redirect_uri: `${configuredOrigin}/`,
      });
      const trustedEndpoint = new URL(metadata.end_session_endpoint);
      if (
        endSession.origin !== trustedEndpoint.origin ||
        endSession.pathname !== trustedEndpoint.pathname
      ) {
        return redirectResponse("/login", [clearHint]);
      }
      return redirectResponse(endSession.href, [clearHint]);
    } catch {
      return redirectResponse("/login", [clearHint]);
    }
  }

  async function handleOidcRoute(request, pathname, method) {
    if (pathname === "/session/login" && method === "GET")
      return beginLogin(request);
    if (pathname === "/session/register" && method === "GET")
      return beginLogin(request, true);
    if (pathname === OIDC_CALLBACK_PATH && method === "GET")
      return callback(request);
    if (pathname === OIDC_LOGOUT_REDIRECT_PATH && method === "GET")
      return redirectAfterLogout(request);
    if (pathname === "/session/logout" && method === "POST") {
      if (
        request.headers.get("origin") !== configuredOrigin ||
        (request.headers.get("sec-fetch-site") &&
          request.headers.get("sec-fetch-site") !== "same-origin")
      ) {
        return jsonResponse(403, "Cross-origin request rejected");
      }
      return logout(request);
    }
    if (pathname.startsWith("/session/"))
      return jsonResponse(404, "API route not found");
    return undefined;
  }

  function unavailableResponse(rotated, requestCookies, previousRefreshToken) {
    const headers = new Headers({
      "Cache-Control": "private, no-store",
      Vary: "Cookie",
    });
    if (rotated) {
      try {
        for (const cookie of refreshedSessionCookies(
          rotated,
          requestCookies,
          previousRefreshToken,
          configuredOrigin,
        )) {
          headers.append("Set-Cookie", cookie);
        }
      } catch (error) {
        if (!(error instanceof CookieSizeError)) throw error;
        for (const cookie of clearSessionCookies(configuredOrigin))
          headers.append("Set-Cookie", cookie);
      }
    }
    return Response.json(
      { statusCode: 503, message: "The API is temporarily unavailable." },
      { status: 503, headers },
    );
  }

  async function handle(request) {
    const requestUrl = new URL(request.url);
    const pathname = requestUrl.pathname;
    const method = request.method.toUpperCase();
    if (
      requestUrl.origin !== configuredOrigin ||
      requestUrl.username ||
      requestUrl.password
    ) {
      return jsonResponse(400, "Invalid request origin");
    }
    if (pathname === "/session" && method === "GET") {
      const session = await getSession({
        cookieHeader: request.headers.get("cookie"),
        origin: configuredOrigin,
      });
      const headers = new Headers({
        "Cache-Control": "private, no-store",
        Vary: "Cookie",
      });
      for (const cookie of session.cookies)
        headers.append("Set-Cookie", cookie);
      return Response.json(
        {
          provider: "keycloak",
          authenticated: session.authenticated,
          ...session.profile,
        },
        { status: session.authenticated === null ? 503 : 200, headers },
      );
    }
    const oidcResponse = await handleOidcRoute(request, pathname, method);
    if (oidcResponse) return oidcResponse;
    if (!isSafeApiPath(pathname) || !OPENAPI_METHODS.has(method.toLowerCase()))
      return jsonResponse(404, "API route not found");
    if (
      /^\/api\/v1\/(?:portal\/)?auth(?:\/|$)/.test(pathname) &&
      pathname !== profilePath
    )
      return jsonResponse(404, "API route not found");
    if (!allowedMethod(openapiPaths, pathname, method))
      return jsonResponse(404, "API route not found");

    if (!SAFE_METHODS.has(method)) {
      const requestOrigin = request.headers.get("origin");
      const fetchSite = request.headers.get("sec-fetch-site");
      if (
        requestOrigin !== configuredOrigin ||
        (fetchSite && fetchSite !== "same-origin")
      ) {
        return jsonResponse(403, "Cross-origin request rejected");
      }
    }

    const requestCookies = request.headers.get("cookie");
    let accessToken = readToken(requestCookies, `${cookiePrefix}_access_token`);
    const refreshToken = readToken(
      requestCookies,
      `${cookiePrefix}_refresh_token`,
    );
    const invalidCookies = AUTH_COOKIE_NAMES.filter((name) => {
      const sealed = readCookie(requestCookies, name);
      return sealed !== undefined && cipher.open(name, sealed) === undefined;
    }).map((name) => expiredCookie(name, configuredOrigin));
    let body;
    if (!SAFE_METHODS.has(method)) {
      try {
        body = await readBoundedBody(request);
      } catch (error) {
        if (error instanceof RequestBodyTooLargeError) return tooLargeResponse();
        throw error;
      }
    }
    let upstream;
    let rotated;
    try {
      upstream = await callBackend({
        pathname,
        search: requestUrl.search,
        method,
        body,
        accessToken,
        origin: configuredOrigin,
        headers: request.headers,
      });
      if (upstream.status === 401 && refreshToken) {
        const result = await refreshSession(refreshToken);
        if (result.kind === "unavailable") {
          upstream.body?.cancel();
          return unavailableResponse(undefined, requestCookies, refreshToken);
        }
        if (result.kind === "ok" && result.tokens.access_token) {
          rotated = result.tokens;
          accessToken = rotated.access_token;
          upstream = await callBackend({
            pathname,
            search: requestUrl.search,
            method,
            body,
            accessToken,
            origin: configuredOrigin,
            headers: request.headers,
          });
        } else if (result.kind === "invalid") {
          const headers = responseHeaders(upstream);
          for (const cookie of clearSessionCookies(configuredOrigin))
            headers.append("Set-Cookie", cookie);
          return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers,
          });
        }
      }
      if ([301, 302, 303, 307, 308].includes(upstream.status)) {
        upstream.body?.cancel();
        return rotated
          ? unavailableResponse(rotated, requestCookies, refreshToken)
          : jsonResponse(502, "The API returned an unexpected redirect.");
      }
    } catch {
      return unavailableResponse(rotated, requestCookies, refreshToken);
    }

    const headers = responseHeaders(upstream);
    for (const cookie of invalidCookies) headers.append("Set-Cookie", cookie);
    if (rotated) {
      try {
        for (const cookie of sessionCookieHeaders(
          rotated,
          configuredOrigin,
          readToken(requestCookies, `${cookiePrefix}_id_token`),
        )) {
          headers.append("Set-Cookie", cookie);
        }
        if (!rotated.refresh_token && refreshToken) {
          const refreshed = sealCookie(
            `${cookiePrefix}_refresh_token`,
            refreshToken,
            configuredOrigin,
            60 * 60 * 24 * 30,
          );
          if (refreshed) headers.append("Set-Cookie", refreshed);
        }
      } catch (error) {
        if (!(error instanceof CookieSizeError)) throw error;
        const headers = new Headers({
          "Cache-Control": "private, no-store",
          Vary: "Cookie",
        });
        for (const cookie of clearSessionCookies(configuredOrigin))
          headers.append("Set-Cookie", cookie);
        return Response.json(
          { statusCode: 503, message: "The session could not be renewed." },
          { status: 503, headers },
        );
      }
    }
    if (
      upstream.status === 401 &&
      (accessToken || refreshToken || invalidCookies.length)
    ) {
      for (const cookie of clearSessionCookies(configuredOrigin))
        headers.append("Set-Cookie", cookie);
    }
    let responseBody = upstream.body;
    if ([204, 205, 304].includes(upstream.status) || method === "HEAD")
      responseBody = null;
    return new Response(responseBody, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  }

  return { handle, getSession };
}

export function createBffProxyCache() {
  let fingerprint;
  let proxy;
  return (nextFingerprint, options) => {
    if (proxy && fingerprint === nextFingerprint) return proxy;
    proxy = createBffProxy(options);
    fingerprint = nextFingerprint;
    return proxy;
  };
}

export function createConfigFingerprint(values) {
  return createHash("sha256")
    .update(JSON.stringify(values))
    .digest("base64url");
}
