import 'reflect-metadata';
import { DataSource, QueryRunner } from 'typeorm';
import { AddExternalIdentities1793210000000 } from '../../src/database/migrations/1793210000000-add-external-identities';
import { ExternalIdentity } from '../../src/identity/entities/external-identity.entity';

const user = '00000000-0000-4000-8000-000000000001';
const otherUser = '00000000-0000-4000-8000-000000000002';
const client = '00000000-0000-4000-8000-000000000003';
const missing = '00000000-0000-4000-8000-000000000004';

const describeIntegration =
  process.env.IDENTITY_TEST_HOST === 'identity-db' ? describe : describe.skip;

describeIntegration('external identity migration (PostgreSQL)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  const migration = new AddExternalIdentities1793210000000();

  beforeAll(async () => {
    // This test is deliberately restricted to the disposable Docker database.
    if (process.env.IDENTITY_TEST_HOST !== 'identity-db') {
      throw new Error(
        'Run this test with test/integration/run-external-identity.sh',
      );
    }
    dataSource = new DataSource({
      type: 'postgres',
      host: 'identity-db',
      port: 5432,
      username: 'identity_test',
      password: 'identity_test',
      database: 'identity_test',
      entities: [ExternalIdentity],
      synchronize: false,
      installExtensions: false,
    });
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await runner.query('CREATE SCHEMA identity_migration_test');
    await runner.query('SET search_path TO identity_migration_test, public');
    await runner.query('CREATE TABLE users (id uuid PRIMARY KEY)');
    await runner.query('CREATE TABLE clients (id uuid PRIMARY KEY)');
    await runner.query('INSERT INTO users VALUES ($1), ($2)', [
      user,
      otherUser,
    ]);
    await runner.query('INSERT INTO clients VALUES ($1)', [client]);
    await migration.up(runner);
  });

  afterAll(async () => {
    if (runner && !runner.isReleased) {
      await runner.query(
        'DROP SCHEMA IF EXISTS identity_migration_test CASCADE',
      );
      await runner.release();
    }
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('persists both mapping types using the entity metadata', async () => {
    const repository = runner.manager.getRepository(ExternalIdentity);
    const saved = await repository.save({
      issuer: 'issuer-a',
      subject: 'subject-a',
      identity_type: 'user',
      user_id: user,
      client_id: null,
    });
    expect(saved.id).toMatch(/^[0-9a-f-]{36}$/);
    await repository.save({
      issuer: 'issuer-a',
      subject: 'subject-a',
      identity_type: 'portal-client',
      user_id: null,
      client_id: client,
    });
    await repository.save({
      issuer: 'issuer-b',
      subject: 'subject-a',
      identity_type: 'user',
      user_id: user,
      client_id: null,
    });
    expect(await repository.count()).toBe(3);
  });

  it('rejects malformed mappings and missing parent records', async () => {
    const insert = (
      type: string,
      userId: string | null,
      clientId: string | null,
    ) =>
      runner.query(
        'INSERT INTO external_identities (issuer, subject, identity_type, user_id, client_id) VALUES ($1, $2, $3, $4, $5)',
        ['issuer-c', 'subject-c', type, userId, clientId],
      );
    for (const [type, userId, clientId] of [
      ['user', null, null],
      ['user', user, client],
      ['portal-client', user, null],
      ['unknown', user, null],
    ] as [string, string | null, string | null][]) {
      await expect(insert(type, userId, clientId)).rejects.toMatchObject({
        code: '23514',
      });
    }
    await expect(insert('user', missing, null)).rejects.toMatchObject({
      code: '23503',
    });
    await expect(insert('portal-client', null, missing)).rejects.toMatchObject({
      code: '23503',
    });
  });

  it('enforces subject and per-issuer parent uniqueness', async () => {
    const insert = (
      issuer: string,
      subject: string,
      type: string,
      userId: string | null,
      clientId: string | null,
    ) =>
      runner.query(
        'INSERT INTO external_identities (issuer, subject, identity_type, user_id, client_id) VALUES ($1, $2, $3, $4, $5)',
        [issuer, subject, type, userId, clientId],
      );
    await expect(
      insert('issuer-a', 'subject-a', 'user', otherUser, null),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'UQ_external_identities_issuer_subject_type',
    });
    await expect(
      insert('issuer-a', 'other', 'user', user, null),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'UQ_external_identities_user',
    });
    await expect(
      insert('issuer-a', 'other', 'portal-client', null, client),
    ).rejects.toMatchObject({
      code: '23505',
      constraint: 'UQ_external_identities_client',
    });
  });

  it('cascades parent deletion and supports down followed by up', async () => {
    await runner.query('DELETE FROM users WHERE id = $1', [user]);
    expect(
      await runner.query('SELECT * FROM external_identities'),
    ).toHaveLength(1);
    await runner.query('DELETE FROM clients WHERE id = $1', [client]);
    expect(
      await runner.query('SELECT * FROM external_identities'),
    ).toHaveLength(0);
    await migration.down(runner);
    const [result] = (await runner.query(
      "SELECT to_regclass('identity_migration_test.external_identities') AS name",
    )) as { name: string | null }[];
    expect(result.name).toBeNull();
    await migration.up(runner);
    expect(
      await runner.query('SELECT * FROM external_identities'),
    ).toHaveLength(0);
  });
});
