import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { parseImageOptions } from "./smoke-config.mjs";

const { app, image } = parseImageOptions(process.argv.slice(2));
const docker = (parameters, allowFailure = false) => {
  const result = spawnSync("docker", parameters, {
    encoding: "utf8",
    timeout: 30_000,
  });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(
      `docker ${parameters[0]} failed: ${result.error?.message ?? result.stderr}`,
    );
  }
  return result;
};
const mock = createServer((request, response) => {
  request.resume();
  response.writeHead(401, { "Content-Type": "application/json" });
  response.end('{"statusCode":401}');
});
await new Promise((resolve) => mock.listen(0, "0.0.0.0", resolve));
const name = `vegyfresh-smoke-${randomUUID()}`;
const network = process.env.SMOKE_DOCKER_NETWORK;
const apiHost = process.env.SMOKE_API_HOST ?? "host.docker.internal";
const publicOrigin = "http://localhost";
const env = {
  PORT: "80",
  HOST: "0.0.0.0",
  NODE_ENV: "production",
  VEGYFRESH_PUBLIC_ORIGIN: publicOrigin,
  VEGYFRESH_API_URL: `http://${apiHost}:${mock.address().port}`,
  OIDC_ISSUER: "http://127.0.0.1:9/unused",
  OIDC_CLIENT_ID: `vegyfresh-${app}`,
  OIDC_CLIENT_SECRET: "smoke-only-client-secret",
  OIDC_API_AUDIENCE: "https://api.vegyfresh.test",
  ...(app === "admin" && {
    OIDC_PROVISIONING_SECRET: "smoke-only-provisioning-secret-long-enough",
  }),
  VEGYFRESH_SESSION_SECRET: "smoke-only-secret-at-least-32-bytes",
};
const request = (origin, path, options = {}) =>
  fetch(`${origin}${path}`, {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(5000),
  });
try {
  docker([
    "run",
    "--detach",
    "--name",
    name,
    "--publish",
    "127.0.0.1::80",
    "--add-host",
    "host.docker.internal:host-gateway",
    ...(network ? ["--network", network] : []),
    ...Object.entries(env).flatMap(([key, value]) => [
      "--env",
      `${key}=${value}`,
    ]),
    image,
  ]);
  const port = docker([
    "inspect",
    "--format",
    '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}',
    name,
  ]).stdout.trim();
  assert.match(port, /^\d+$/);
  const origin = network ? `http://${name}:80` : `http://127.0.0.1:${port}`;
  let healthy = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await request(origin, "/health");
      healthy = response.ok;
      await response.body?.cancel();
    } catch {
      /* startup */
    }
    if (healthy) break;
    await delay(250);
  }
  assert.ok(healthy, `${app}: server did not start`);
  const session = await request(origin, "/session");
  assert.equal(session.status, 200);
  assert.match(
    session.headers.get("cache-control") ?? "",
    /private, no-store/i,
  );
  assert.deepEqual(await session.json(), {
    provider: "oidc",
    authenticated: false,
  });
  const admin = app === "admin";
  const privatePath = admin ? "/orders" : "/portal/dashboard";
  const privateResponse = await request(origin, privatePath);
  assert.equal(privateResponse.status, admin ? 303 : 307);
  assert.equal(
    privateResponse.headers.get("location"),
    admin ? "/session/login?returnTo=%2Forders" : "/",
  );
  await privateResponse.body?.cancel();

  const retiredRoutes = admin
    ? ["/login", "/signup"]
    : ["/login", "/signup", "/register", "/setup-password"];
  for (const path of retiredRoutes) {
    const response = await request(origin, path);
    assert.equal(response.status, 404, `${app}: ${path} has been removed`);
    await response.body?.cancel();
  }

  const page = await request(
    origin,
    admin ? "/error?error=%3Cscript%3Esecret%3C%2Fscript%3E" : "/",
  );
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(!html.includes("Switched to client rendering"));
  if (admin) {
    assert.match(html, /No fue posible iniciar sesión/);
    assert.doesNotMatch(html, /<script>secret/);
  } else {
    assert.match(html, /Sign in to access/);
    assert.match(html, /session\/login\?returnTo=%2Fportal%2Fdashboard/);
  }
  assert.doesNotMatch(
    html,
    /smoke-only-secret-at-least-32-bytes|access-[A-Za-z]+|refresh-[A-Za-z]+/,
  );
  assert.doesNotMatch(html, /type="password"/i);
  const assetPath = html.match(
    /src="(\/(?:assets|_build)\/[^\"]+\.js(?:\?[^\"]*)?)"/,
  )?.[1];
  assert.ok(assetPath, `${app}: public client bundle missing`);
  const asset = await request(origin, assetPath);
  assert.equal(asset.status, 200);
  await asset.body?.cancel();
  const source = await request(origin, "/.output/server/index.mjs");
  assert.equal(source.status, 404);
  await source.body?.cancel();

  const allowedRoute = admin ? "/api/v1/orders" : "/api/v1/portal/orders";
  const forbiddenRoute = admin ? "/api/v1/portal/orders" : "/api/v1/orders";
  const legacyCredentialRoute = admin
    ? "/api/v1/auth/login"
    : "/api/v1/portal/auth/login";
  const wrongApplication = await request(origin, forbiddenRoute);
  assert.equal(
    wrongApplication.status,
    404,
    `${app}: reject the other application's API route`,
  );
  await wrongApplication.body?.cancel();
  const legacyCredential = await request(origin, legacyCredentialRoute, {
    method: "POST",
    headers: { Origin: publicOrigin, "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(
    legacyCredential.status,
    404,
    `${app}: reject legacy browser credential endpoints`,
  );
  await legacyCredential.body?.cancel();

  const anonymous = await request(origin, allowedRoute);
  assert.equal(anonymous.status, 401);
  await anonymous.body?.cancel();
  const crossOrigin = await request(
    origin,
    admin ? allowedRoute : "/session/logout",
    {
      method: "POST",
      headers: {
        Origin: "https://untrusted.invalid",
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  );
  assert.equal(
    crossOrigin.status,
    403,
    `${app}: reject cross-origin mutations`,
  );
  await crossOrigin.body?.cancel();
  if (admin) {
    const sameOriginWrite = await request(origin, allowedRoute, {
      method: "POST",
      headers: { Origin: publicOrigin, "Content-Type": "application/json" },
      body: "{}",
    });
    assert.equal(
      sameOriginWrite.status,
      401,
      `${app}: same-origin writes pass the origin check but still require authentication`,
    );
    await sameOriginWrite.body?.cancel();
  }
  console.log(
    `${app}: packaged session, redirects, SSR, API allowlists, CSRF, assets and source isolation passed`,
  );
} catch (error) {
  const logs = docker(["logs", name], true);
  error.message += `\n${logs.stdout ?? ""}\n${logs.stderr ?? ""}`;
  throw error;
} finally {
  docker(["rm", "--force", name], true);
  await new Promise((resolve) => {
    mock.close(resolve);
    mock.closeAllConnections();
  });
}
