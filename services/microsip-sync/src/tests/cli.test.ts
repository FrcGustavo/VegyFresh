import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { runCli } from "../cli.js";
import { openHistory } from "../history.js";

test("CLI integrates real HTTP SDK reads, approvals, SQLite restart, simulator and local review commands", async t => {
  const directory = await mkdtemp(join(tmpdir(), "vf-sync-cli-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const config = JSON.parse(await readFile(new URL("../../config.example.json", import.meta.url), "utf8"));
  config.company = randomUUID();
  config.dataDir = join(directory, "data");
  config.pageSize = 1;
  const orderId = randomUUID();
  const clientId = Object.keys(config.clients)[0]!;
  const productId = randomUUID();
  const order = {
    id: orderId, organization_id: config.organizationId, origin: "WHATSAPP",
    status: "PENDING_REVIEW", created_at: config.since, client_id: clientId,
    client: { id: clientId, organization_id: config.organizationId },
    total_amount: "9999999.00",
    items: [{ order_id: orderId, product_id: productId, quantity: "5.250",
      unit_price: "99999", product: { id: productId, organization_id: config.organizationId, folio: "TOMATE", unit: "kg" } }],
  };
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);
    assert.equal(request.method, "GET");
    assert.equal(request.headers.authorization, "Bearer fixture-token");
    const url = new URL(request.url!, "http://localhost");
    response.setHeader("content-type", "application/json");
    response.end(JSON.stringify(url.pathname.endsWith(orderId) ? order :
      Number(url.searchParams.get("offset")) === 0 ? [order] : []));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  config.apiBaseUrl = `http://127.0.0.1:${address.port}/api/v1`;
  const configPath = join(directory, "sync.json");
  await writeFile(configPath, JSON.stringify(config));
  const tokenBefore = process.env.MICROSIP_SYNC_API_TOKEN;
  const tokenFileBefore = process.env.MICROSIP_SYNC_TOKEN_FILE;
  process.env.MICROSIP_SYNC_API_TOKEN = "fixture-token";
  delete process.env.MICROSIP_SYNC_TOKEN_FILE;
  const output: string[] = [];
  const logger = console.log;
  console.log = value => { output.push(String(value)); };
  t.after(() => {
    console.log = logger;
    if (tokenBefore === undefined) delete process.env.MICROSIP_SYNC_API_TOKEN;
    else process.env.MICROSIP_SYNC_API_TOKEN = tokenBefore;
    if (tokenFileBefore === undefined) delete process.env.MICROSIP_SYNC_TOKEN_FILE;
    else process.env.MICROSIP_SYNC_TOKEN_FILE = tokenFileBefore;
  });
  const command = (...args: string[]) => runCli([...args, "--config", configPath]);
  await command("once");
  assert.equal(JSON.parse(output.at(-1)!).synced, 0);
  order.status = "APPROVED";
  await command("once");
  assert.equal(JSON.parse(output.at(-1)!).synced, 1);
  await command("once");
  assert.equal(JSON.parse(output.at(-1)!).synced, 0);
  const simulator = new DatabaseSync(join(config.dataDir, "simulator.sqlite"));
  assert.equal(simulator.prepare("SELECT count(*) AS count FROM simulator_receipts").get()!.count, 1);
  simulator.close();
  const history = openHistory(config.dataDir, config.company, config.organizationId);
  const synced = history.get(orderId)!;
  assert.equal(synced.receipt?.folio, "SIM-00000001");
  assert.equal(synced.payload?.lines[0]?.quantity, 5.25);
  assert.equal(JSON.stringify(synced.payload).includes("price"), false);
  await command("history");
  assert.equal(JSON.parse(output.at(-1)!).length, 1);
  await assert.rejects(command("retry", orderId, "--confirmed-absent"), /already running/);
  const reviewId = randomUUID();
  history.save({ orderId: reviewId, externalId: `vegyfresh:${config.organizationId}:${reviewId}`,
    status: "review", attempts: 5, updatedAt: new Date().toISOString(), error: "fixture" });
  history.close();
  delete process.env.MICROSIP_SYNC_API_TOKEN;
  const apiCalls = requests.length;
  await command("history");
  assert.equal(JSON.parse(output.at(-1)!).length, 2);
  assert.equal(output.at(-1)!.includes("payload"), false);
  await command("retry", reviewId, "--confirmed-absent");
  await command("resolve", reviewId, "MS-MANUAL-1");
  assert.equal(requests.length, apiCalls);
  const reopened = openHistory(config.dataDir, config.company, config.organizationId);
  assert.equal(reopened.get(reviewId)?.receipt?.folio, "MS-MANUAL-1");
  reopened.close();
  config.adapter = { mode: "module", modulePath: "./nonexistent.mjs" };
  await writeFile(configPath, JSON.stringify(config));
  await assert.rejects(command("history"), /otro dataDir/);
});
