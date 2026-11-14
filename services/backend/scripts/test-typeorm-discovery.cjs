const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
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
require('reflect-metadata');
const assert = require('node:assert/strict');
const dataSource = require(process.env.DATA_SOURCE).default;
(async () => {
  await dataSource.buildMetadatas();
  assert.deepEqual(dataSource.entityMetadatas.map((entity) => entity.name).sort(), JSON.parse(process.env.EXPECTED_ENTITIES));
  assert.deepEqual(dataSource.migrations.map((migration) => migration.constructor.name).sort(), JSON.parse(process.env.EXPECTED_MIGRATIONS));
})().catch((error) => { console.error(error); process.exitCode = 1; });
`;

for (const mode of ['source', 'compiled']) {
  test(`discovers ${mode} entities and migrations regardless of cwd`, () => {
    for (const cwd of [packageRoot, path.resolve(packageRoot, '../..')]) {
      execFileSync(process.execPath, [
        ...(mode === 'source' ? ['-r', require.resolve('ts-node/register')] : []),
        '-e', probe,
      ], {
        cwd,
        stdio: 'pipe',
        env: {
          ...process.env,
          NODE_PATH: path.join(packageRoot, 'node_modules'),
          TS_NODE_PROJECT: path.join(packageRoot, 'tsconfig.json'),
          DATA_SOURCE: path.join(packageRoot, mode === 'source' ? 'src/database/dataSource.ts' : 'dist/database/dataSource.js'),
          EXPECTED_ENTITIES: JSON.stringify(expectedEntities),
          EXPECTED_MIGRATIONS: JSON.stringify(expectedMigrations),
          POSTGRES_HOST: 'localhost', POSTGRES_PORT: '5432',
          POSTGRES_USER: 'test', POSTGRES_PASSWORD: 'test', POSTGRES_DB: 'test',
        },
      });
    }
  });
}
