import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-architecture.mjs", import.meta.url));
function check(files) {
  const root = mkdtempSync(path.join(os.tmpdir(), "portal-layers-"));
  try {
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "tsconfig.app.json"), JSON.stringify({ compilerOptions: { target: "ESNext", moduleResolution: "Bundler", module: "ESNext" } }));
    for (const [name, content] of Object.entries(files)) {
      const file = path.join(root, "src", name);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    return spawnSync(process.execPath, [checker, root], { encoding: "utf8" });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test("accepts inward dependencies", () => {
  const result = check({ "domain/model.ts": "export type Model = string;", "application/use.ts": 'import type { Model } from "../domain/model"; export type Result = Model;' });
  assert.equal(result.status, 0, result.stderr);
});

test("rejects outward dependencies and browser storage in presentation", () => {
  const result = check({ "presentation/view.ts": 'export const value = window.localStorage;', "application/use.ts": 'import "../presentation/view";' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Dependencia fuera de la capa application/);
  assert.match(result.stderr, /almacenamiento del navegador/);
});
