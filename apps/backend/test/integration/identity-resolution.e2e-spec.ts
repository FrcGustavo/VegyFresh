import 'reflect-metadata';
import { join } from 'path';
import { DataSource, EntityTarget, ObjectLiteral, QueryRunner } from 'typeorm';
import { UnauthorizedException } from '@nestjs/common';
import { AddExternalIdentities1793210000000 } from '../../src/database/migrations/1793210000000-add-external-identities';
import { ExternalIdentity } from '../../src/identity/entities/external-identity.entity';
import { IdentityService } from '../../src/identity/identity.service';
import { User } from '../../src/users/entities/user.entity';
import { Client } from '../../src/clients/entities/client.entity';
import { Role } from '../../src/roles/entities/role.entity';
import { Organization } from '../../src/organizations/entities/organization.entity';

const userId = '00000000-0000-4000-8000-000000000011';
const clientId = '00000000-0000-4000-8000-000000000012';
const roleId = '00000000-0000-4000-8000-000000000013';
const orgId = '00000000-0000-4000-8000-000000000014';
const otherOrgId = '00000000-0000-4000-8000-000000000015';
const describeIntegration =
  process.env.IDENTITY_TEST_HOST === 'identity-db' ? describe : describe.skip;

describeIntegration('identity resolution (PostgreSQL)', () => {
  let dataSource: DataSource;
  let runner: QueryRunner;
  let service: IdentityService;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      host: 'identity-db',
      port: 5432,
      username: 'identity_test',
      password: 'identity_test',
      database: 'identity_test',
      entities: [join(__dirname, '../../src/**/*.entity.ts')],
      synchronize: false,
      installExtensions: false,
    });
    await dataSource.initialize();
    runner = dataSource.createQueryRunner();
    await runner.connect();
    await runner.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await runner.query('CREATE SCHEMA identity_resolution_test');
    await runner.query('SET search_path TO identity_resolution_test, public');

    // Use the actual entity columns while isolating this test from unrelated tables.
    for (const entity of [
      Organization,
      Role,
      User,
      Client,
    ] as EntityTarget<ObjectLiteral>[]) {
      const metadata = dataSource.getMetadata(entity);
      const columns = metadata.columns.map((column) => {
        const type =
          column.type === 'uuid'
            ? 'uuid'
            : column.type === 'jsonb'
              ? 'jsonb'
              : 'text';
        return `"${column.databaseName}" ${type}${column.isPrimary ? ' PRIMARY KEY' : ''}`;
      });
      await runner.query(
        `CREATE TABLE "${metadata.tableName}" (${columns.join(', ')})`,
      );
    }
    await new AddExternalIdentities1793210000000().up(runner);
    await runner.query(
      'INSERT INTO organizations (id, name) VALUES ($1, $2), ($3, $4)',
      [orgId, 'First', otherOrgId, 'Second'],
    );
    await runner.query(
      'INSERT INTO roles (id, name, permissions) VALUES ($1, $2, $3)',
      [
        roleId,
        'manager',
        JSON.stringify([{ resource: 'orders', action: 'read' }]),
      ],
    );
    await runner.query(
      'INSERT INTO users (id, email, role_id, organization_id) VALUES ($1, $2, $3, $4)',
      [userId, 'user@example.test', roleId, orgId],
    );
    await runner.query(
      'INSERT INTO clients (id, email, organization_id) VALUES ($1, $2, $3)',
      [clientId, 'client@example.test', otherOrgId],
    );
    await runner.query(
      "INSERT INTO external_identities (issuer, subject, identity_type, user_id) VALUES ('issuer-a', 'shared', 'user', $1)",
      [userId],
    );
    await runner.query(
      "INSERT INTO external_identities (issuer, subject, identity_type, client_id) VALUES ('issuer-a', 'shared', 'portal-client', $1)",
      [clientId],
    );
    service = new IdentityService(
      dataSource,
      runner.manager.getRepository(ExternalIdentity),
      runner.manager.getRepository(User),
      runner.manager.getRepository(Client),
    );
  });

  afterAll(async () => {
    if (runner && !runner.isReleased) {
      await runner.query(
        'DROP SCHEMA IF EXISTS identity_resolution_test CASCADE',
      );
      await runner.release();
    }
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  it('isolates mapping types and reads organization and permissions from the database', async () => {
    await expect(service.resolveUser('issuer-a', 'shared')).resolves.toEqual({
      sub: userId,
      email: 'user@example.test',
      org_id: orgId,
      role: 'manager',
      permissions: ['orders:read'],
    });
    await expect(
      service.resolvePortalClient('issuer-a', 'shared'),
    ).resolves.toEqual({
      sub: clientId,
      email: 'client@example.test',
      organization_id: otherOrgId,
      type: 'portal-client',
    });
    await expect(
      service.resolveUser('issuer-b', 'shared'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(
      service.resolvePortalClient('issuer-a', 'user@example.test'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await runner.query('UPDATE roles SET permissions = $1 WHERE id = $2', [
      JSON.stringify([{ resource: 'users', action: 'manage' }]),
      roleId,
    ]);
    await runner.query('UPDATE users SET organization_id = $1 WHERE id = $2', [
      otherOrgId,
      userId,
    ]);
    await expect(
      service.resolveUser('issuer-a', 'shared'),
    ).resolves.toMatchObject({
      org_id: otherOrgId,
      permissions: ['users:manage'],
    });
  });

  it('rejects accounts after their organization or role becomes unavailable', async () => {
    await runner.query(
      'UPDATE users SET organization_id = NULL WHERE id = $1',
      [userId],
    );
    await expect(
      service.resolveUser('issuer-a', 'shared'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await runner.query(
      'UPDATE users SET organization_id = $1, role_id = NULL WHERE id = $2',
      [orgId, userId],
    );
    await expect(
      service.resolveUser('issuer-a', 'shared'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    await runner.query(
      'UPDATE clients SET organization_id = NULL WHERE id = $1',
      [clientId],
    );
    await expect(
      service.resolvePortalClient('issuer-a', 'shared'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
