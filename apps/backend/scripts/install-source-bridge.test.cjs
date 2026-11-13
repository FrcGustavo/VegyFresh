const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vegyfresh-source-bridge-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, 'apps/backend/scripts');
  const modules = path.join(root, 'apps/backend/node_modules');
  const link = path.join(root, 'services/backend/node_modules');
  fs.mkdirSync(scripts, { recursive: true });
  fs.mkdirSync(modules, { recursive: true });
  fs.copyFileSync(__filename.replace('.test.cjs', '.cjs'), path.join(scripts, 'install-source-bridge.cjs'));
  return { script: path.join(scripts, 'install-source-bridge.cjs'), modules, link };
}

test('creates an idempotent link to the package dependencies', (t) => {
  const { script, modules, link } = fixture(t);
  execFileSync(process.execPath, [script]);
  execFileSync(process.execPath, [script]);
  assert.equal(fs.realpathSync(link), fs.realpathSync(modules));
});

test('refuses to replace an existing directory', (t) => {
  const { script, link } = fixture(t);
  fs.mkdirSync(link, { recursive: true });
  const result = spawnSync(process.execPath, [script], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /already exists/);
  assert.ok(fs.statSync(link).isDirectory());
});
