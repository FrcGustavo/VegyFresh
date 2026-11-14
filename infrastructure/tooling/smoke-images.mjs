import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { setTimeout as delay } from "node:timers/promises";
import { parseImageOptions } from "./smoke-config.mjs";

const { app, image } = parseImageOptions(process.argv.slice(2));
const docker = (parameters, allowFailure = false) => {
  const result = spawnSync("docker", parameters, { encoding: "utf8", timeout: 30_000 });
  if (!allowFailure && (result.error || result.status !== 0)) {
    throw new Error(`docker ${parameters[0]} failed: ${result.error?.message ?? result.stderr}`);
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
  PORT: "80", HOST: "0.0.0.0", NODE_ENV: "production",
  VEGYFRESH_PUBLIC_ORIGIN: publicOrigin,
  VEGYFRESH_API_URL: `http://${apiHost}:${mock.address().port}`,
  KEYCLOAK_ISSUER: "http://127.0.0.1:9/realms/unused",
  KEYCLOAK_CLIENT_ID: `vegyfresh-${app}`,
  VEGYFRESH_SESSION_SECRET: "smoke-only-secret-at-least-32-bytes",
};
const request = (origin, path, options = {}) => fetch(`${origin}${path}`, {
  ...options, redirect: "manual", signal: AbortSignal.timeout(5000),
});
try {
  docker(["run", "--detach", "--name", name, "--publish", "127.0.0.1::80",
    "--add-host", "host.docker.internal:host-gateway",
    ...(network ? ["--network", network] : []),
    ...Object.entries(env).flatMap(([key, value]) => ["--env", `${key}=${value}`]), image]);
  const port = docker(["inspect", "--format", '{{(index (index .NetworkSettings.Ports "80/tcp") 0).HostPort}}', name]).stdout.trim();
  assert.match(port, /^\d+$/);
  const origin = network ? `http://${name}:80` : `http://127.0.0.1:${port}`;
  let healthy = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    try { const response = await request(origin, "/health"); healthy = response.ok; await response.body?.cancel(); } catch { /* startup */ }
    if (healthy) break;
    await delay(250);
  }
  assert.ok(healthy, `${app}: server did not start`);
  const session = await request(origin, "/session");
  assert.equal(session.status, 200);
  assert.deepEqual(await session.json(), { provider: "keycloak", authenticated: false });
  const privatePath = app === "admin" ? "/orders" : "/portal/dashboard";
  const privateResponse = await request(origin, privatePath);
  assert.equal(privateResponse.status, app === "admin" ? 303 : 307);
  assert.equal(privateResponse.headers.get("location"), app === "admin" ? "/login?returnTo=%2Forders" : "/");
  await privateResponse.body?.cancel();
  const page = await request(origin, app === "admin" ? "/error" : "/");
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.ok(!html.includes("Switched to client rendering"));
  if (app === "portal") assert.match(html, /Sign in to access/);
  const assetPath = html.match(/src="(\/(?:assets|_build)\/[^\"]+\.js(?:\?[^\"]*)?)"/)?.[1];
  assert.ok(assetPath, `${app}: public client bundle missing`);
  const asset = await request(origin, assetPath);
  assert.equal(asset.status, 200);
  await asset.body?.cancel();
  const source = await request(origin, "/.output/server/index.mjs");
  assert.equal(source.status, 404);
  await source.body?.cancel();
  const path = app === "admin" ? "/api/v1/orders" : "/api/v1/portal/orders";
  const anonymous = await request(origin, path);
  assert.equal(anonymous.status, 401);
  await anonymous.body?.cancel();
  const logout = await request(origin, "/session/logout", { method: "POST", headers: { Origin: "https://untrusted.invalid" } });
  assert.equal(logout.status, 403);
  await logout.body?.cancel();
  console.log(`${app}: packaged health, session, SSR, routes, assets and origin checks passed`);
} catch (error) {
  const logs = docker(["logs", name], true);
  error.message += `\n${logs.stdout ?? ""}\n${logs.stderr ?? ""}`;
  throw error;
} finally {
  docker(["rm", "--force", name], true);
  await new Promise((resolve) => { mock.close(resolve); mock.closeAllConnections(); });
}
