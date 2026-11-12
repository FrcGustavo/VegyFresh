import { DataSource } from 'typeorm';
import { Client } from '../src/clients/entities/client.entity';
import { ExternalIdentity } from '../src/identity/entities/external-identity.entity';
import { IdentityService } from '../src/identity/identity.service';
import { Role } from '../src/roles/entities/role.entity';
import { User } from '../src/users/entities/user.entity';

const issuer = 'https://identity.example.test/realms/vegyfresh';

const describeIntegration =
  process.env.IDENTITY_PROVISIONING_TEST === 'true' ? describe : describe.skip;

describeIntegration('identity provisioning with PostgreSQL', () => {
  let db: DataSource;
  let service: IdentityService;
  const prefix = `provision-${Date.now()}`;

  beforeAll(async () => {
    db = new DataSource({
      type: 'postgres',
      host: process.env.POSTGRES_HOST,
      port: Number(process.env.POSTGRES_PORT),
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      entities: [__dirname + '/../src/**/*.entity.ts'],
      migrations: [__dirname + '/../src/database/migrations/*.ts'],
      synchronize: false,
    });
    await db.initialize();
    await db.runMigrations();
    const roles = db.getRepository(Role);
    if (!(await roles.findOneBy({ name: 'owner' }))) {
      await roles.save(
        roles.create({
          name: 'owner',
          permissions: [{ resource: '*', action: '*' }],
        }),
      );
    }
    service = new IdentityService(
      db,
      db.getRepository(ExternalIdentity),
      db.getRepository(User),
      db.getRepository(Client),
    );
  });

  afterAll(async () => {
    if (db?.isInitialized) {
      await db.query('DELETE FROM external_identities WHERE subject LIKE $1', [
        `${prefix}%`,
      ]);
      await db.query('DELETE FROM users WHERE email LIKE $1', [`${prefix}%`]);
      await db.destroy();
    }
  });

  it('serializes repeated subject provisioning and leaves the user passwordless', async () => {
    const subject = `${prefix}-same`;
    const claims = { email: `${prefix}-same@example.test`, name: 'New Owner' };
    const [first, second] = await Promise.all([
      service.resolveAdminUser(issuer, subject, claims),
      service.resolveAdminUser(issuer, subject, claims),
    ]);
    expect(first.sub).toBe(second.sub);
    expect(first).toMatchObject({ org_id: '', role: 'owner' });
    expect(
      await db.getRepository(User).findOneByOrFail({ id: first.sub }),
    ).toMatchObject({ password_hash: null });
    expect(
      await db.getRepository(ExternalIdentity).countBy({ issuer, subject }),
    ).toBe(1);
  });

  it('never links another subject by matching email, including concurrent requests', async () => {
    const email = `${prefix}-shared@example.test`;
    const results = await Promise.allSettled([
      service.resolveAdminUser(issuer, `${prefix}-one`, { email, name: 'One' }),
      service.resolveAdminUser(issuer, `${prefix}-two`, {
        email: email.toUpperCase(),
        name: 'Two',
      }),
    ]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const rejection = results.find((r) => r.status === 'rejected');
    expect(rejection).toMatchObject({
      reason: { response: { code: 'USER_NOT_LINKED' } },
    });
    expect(await db.getRepository(User).countBy({ email })).toBe(1);
    expect(
      (await db
        .getRepository(ExternalIdentity)
        .countBy({ issuer, subject: `${prefix}-one` })) +
        (await db
          .getRepository(ExternalIdentity)
          .countBy({ issuer, subject: `${prefix}-two` })),
    ).toBe(1);
  });

  it('rolls back the user if the identity insert fails', async () => {
    const email = `${prefix}-rollback@example.test`;
    await db.query(
      `CREATE FUNCTION test_reject_provision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'forced failure'; END; $$`,
    );
    await db.query(
      'CREATE TRIGGER test_reject_provision BEFORE INSERT ON external_identities FOR EACH ROW EXECUTE FUNCTION test_reject_provision()',
    );
    try {
      await expect(
        service.resolveAdminUser(issuer, `${prefix}-rollback`, {
          email,
          name: 'Rollback',
        }),
      ).rejects.toThrow();
      expect(await db.getRepository(User).findOneBy({ email })).toBeNull();
    } finally {
      await db.query(
        'DROP TRIGGER IF EXISTS test_reject_provision ON external_identities',
      );
      await db.query('DROP FUNCTION IF EXISTS test_reject_provision()');
    }
  });
});
