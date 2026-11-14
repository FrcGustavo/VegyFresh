const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

const packageRoot = path.resolve(__dirname, '..');
const expectedEntities = [
  'AuthSession',
  'Client',
  'ExternalIdentity',
  'InventoryMovement',
  'Order',
  'OrderItem',
  'Organization',
  'PortalAuthSession',
  'PriceList',
  'Product',
  'ProductPrice',
  'Purchase',
  'PurchaseItem',
  'Role',
  'Supplier',
  'User',
].sort();
const expectedMigrations = [
  'Init1781596607960',
  'AllowOrgLessAuthSessions1781772602000',
  'RemoveProductSku1781930269000',
  'AddExternalIdentities1793210000000',
  'AllowNullUserPasswordHash1793210001000',
].sort();

const probe = `
const assert = require('node:assert/strict');
const path = require('node:path');
const root = process.env.FIXTURE_ROOT;
require(path.join(root, 'apps/backend/node_modules/reflect-metadata'));
const extension = process.env.FIXTURE_EXTENSION;
const dataSource = require(path.join(root, 'apps/backend', process.env.FIXTURE_DATA_SOURCE)).default;
(async () => {
  await dataSource.buildMetadatas();
  assert.deepEqual(dataSource.entityMetadatas.map((entity) => entity.name).sort(), JSON.parse(process.env.EXPECTED_ENTITIES));
  assert.deepEqual(dataSource.migrations.map((migration) => migration.constructor.name).sort(), JSON.parse(process.env.EXPECTED_MIGRATIONS));
  if (extension === 'ts') {
    const app = require(path.join(root, 'apps/backend/src/auth/entities/auth-session.entity.ts'));
    const service = require(path.join(root, 'services/backend/src/auth/entities/auth-session.entity.ts'));
    assert.equal(app.AuthSession, service.AuthSession);
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vegyfresh-discovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const app = path.join(root, 'apps/backend');
  const service = path.join(root, 'services/backend');
  fs.mkdirSync(service, { recursive: true });
  fs.mkdirSync(app, { recursive: true });
  fs.mkdirSync(path.join(app, 'src'));
  for (const entry of fs.readdirSync(path.join(packageRoot, 'src'))) {
    fs.cpSync(
      fs.realpathSync(path.join(packageRoot, 'src', entry)),
      path.join(app, 'src', entry),
      { recursive: true },
    );
  }
  fs.copyFileSync(
    path.join(packageRoot, 'tsconfig.json'),
    path.join(app, 'tsconfig.json'),
  );
  fs.symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(app, 'node_modules'),
    'junction',
  );
  fs.symlinkSync(
    path.join(packageRoot, 'node_modules'),
    path.join(service, 'node_modules'),
    'junction',
  );
  fs.mkdirSync(path.join(service, 'src'));
  for (const entry of fs.readdirSync(path.join(app, 'src'), {
    withFileTypes: true,
  })) {
    if (entry.isDirectory()) {
      fs.symlinkSync(
        path.join(app, 'src', entry.name),
        path.join(service, 'src', entry.name),
        'junction',
      );
    }
  }
  return { root, app, service };
}

function moveDirectory({ app, service }, name) {
  fs.unlinkSync(path.join(service, 'src', name));
  fs.renameSync(path.join(app, 'src', name), path.join(service, 'src', name));
  fs.symlinkSync(
    path.join(service, 'src', name),
    path.join(app, 'src', name),
    'junction',
  );
}

function runProbe({ root, app }, mode, cwd) {
  const source = mode === 'source';
  execFileSync(
    process.execPath,
    [
      ...(source ? ['-r', require.resolve('ts-node/register')] : []),
      '-e',
      probe,
    ],
    {
      cwd,
      stdio: 'pipe',
      env: {
        ...process.env,
        TS_NODE_PROJECT: path.join(app, 'tsconfig.json'),
        FIXTURE_ROOT: root,
        FIXTURE_EXTENSION: source ? 'ts' : 'js',
        FIXTURE_DATA_SOURCE: source
          ? 'src/database/dataSource.ts'
          : 'dist/database/dataSource.js',
        EXPECTED_ENTITIES: JSON.stringify(expectedEntities),
        EXPECTED_MIGRATIONS: JSON.stringify(expectedMigrations),
        POSTGRES_HOST: 'localhost',
        POSTGRES_PORT: '5432',
        POSTGRES_USER: 'test',
        POSTGRES_PASSWORD: 'test',
        POSTGRES_DB: 'test',
      },
    },
  );
}

test('discovers each entity and migration across physical source roots', (t) => {
  const layout = fixture(t);
  for (const moved of [[], ['auth'], ['auth', 'database']]) {
    if (moved.length) moveDirectory(layout, moved.at(-1));
    // A second path to the same physical directory must not duplicate entities.
    const alias = path.join(layout.app, 'src', 'auth-alias');
    fs.symlinkSync(path.join(layout.app, 'src', 'auth'), alias, 'junction');
    runProbe(layout, 'source', moved.length % 2 ? layout.root : layout.app);
    fs.unlinkSync(alias);
  }
});

test('discovers the compiled data source independently of the working directory', (t) => {
  const layout = fixture(t);
  fs.cpSync(path.join(packageRoot, 'dist'), path.join(layout.app, 'dist'), {
    recursive: true,
  });
  runProbe(layout, 'compiled', layout.root);
  runProbe(layout, 'compiled', layout.app);
});
