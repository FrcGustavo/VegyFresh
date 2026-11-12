import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { generateKeyPairSync } from 'node:crypto';
import { createServer } from 'node:http';
import type { Server } from 'node:http';
import request from 'supertest';
import { App } from 'supertest/types';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { Client } from '../src/clients/entities/client.entity';
import { ExternalIdentity } from '../src/identity/entities/external-identity.entity';
import { Organization } from '../src/organizations/entities/organization.entity';
import { Role } from '../src/roles/entities/role.entity';
import { User } from '../src/users/entities/user.entity';

const issuer = 'http://identity.e2e.test/realms/vegyfresh';
const audience = 'vegyfresh-api';
const adminClientId = 'vegyfresh-admin';
const portalClientId = 'vegyfresh-portal';
const keyId = 'vegyfresh-identity-e2e-key';

type AuthProfileResponse = {
  user: { id: string; email: string; name: string };
  organization: { id: string } | null;
  role: { id: string; name: string; permissions: string[] };
};

type CreatedOrganizationResponse = { id: string };

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const privateKeyPem = privateKey
  .export({ type: 'pkcs8', format: 'pem' })
  .toString();
const jwks = {
  keys: [
    {
      ...publicKey.export({ format: 'jwk' }),
      kid: keyId,
      alg: 'RS256',
      use: 'sig',
    },
  ],
};
const jwtService = new JwtService();

function createAccessToken(
  subject: string,
  authorizedParty: string,
  scope: string,
  additionalClaims: Record<string, unknown> = {},
) {
  return jwtService.sign(
    {
      sub: subject,
      typ: 'Bearer',
      azp: authorizedParty,
      scope,
      ...additionalClaims,
    },
    {
      privateKey: privateKeyPem,
      algorithm: 'RS256',
      issuer,
      audience,
      expiresIn: '5m',
      keyid: keyId,
    },
  );
}

const describeIntegration =
  process.env.IDENTITY_HTTP_TEST === 'true' ? describe : describe.skip;

describeIntegration('Keycloak identity and tenant e2e', () => {
  let app: INestApplication<App>;
  let dataSource: DataSource;
  let jwksServer: Server;
  let issuerUrl: string;
  let orgA: Organization;
  let orgB: Organization;
  let userA: User;
  let userB: User;
  let portalClient: Client;
  let role: Role;
  let subjectA: string;
  let subjectB: string;
  let portalSubject: string;
  let externalIdentities: string[] = [];
  const userIds: string[] = [];
  const clientIds: string[] = [];
  const organizationIds: string[] = [];
  let roleId: string | undefined;

  beforeAll(async () => {
    jwksServer = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(jwks));
    });
    await new Promise<void>((resolve, reject) => {
      jwksServer.once('error', reject);
      jwksServer.listen(0, '127.0.0.1', resolve);
    });
    const serverAddress = jwksServer.address();
    if (!serverAddress || typeof serverAddress === 'string') {
      throw new Error('The test JWKS server did not bind a TCP port');
    }
    issuerUrl = `http://127.0.0.1:${serverAddress.port}/jwks`;

    process.env.KEYCLOAK_ISSUER = issuer;
    process.env.KEYCLOAK_JWKS_URI = issuerUrl;
    process.env.KEYCLOAK_AUDIENCE = audience;
    process.env.KEYCLOAK_ADMIN_CLIENT_ID = adminClientId;
    process.env.KEYCLOAK_PORTAL_CLIENT_ID = portalClientId;
    process.env.KEYCLOAK_ADMIN_SCOPE = 'vegyfresh-api';
    process.env.KEYCLOAK_PORTAL_SCOPE = 'vegyfresh-portal';

    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication({ logger: false });
    app.setGlobalPrefix('api/v1');
    await app.init();

    dataSource = app.get(DataSource);
    const suffix = Date.now().toString(36);
    subjectA = `identity-e2e-user-a-${suffix}`;
    subjectB = `identity-e2e-user-b-${suffix}`;
    portalSubject = `identity-e2e-client-${suffix}`;
    const organizationRepository = dataSource.getRepository(Organization);
    const roleRepository = dataSource.getRepository(Role);
    const userRepository = dataSource.getRepository(User);
    const clientRepository = dataSource.getRepository(Client);
    const identityRepository = dataSource.getRepository(ExternalIdentity);

    role = await roleRepository.save(
      roleRepository.create({
        name: `identity-e2e-${suffix}`,
        permissions: [{ resource: 'orders', action: 'read' }],
      }),
    );
    roleId = role.id;
    orgA = await organizationRepository.save(
      organizationRepository.create({
        folio: `ID-E2E-A-${suffix}`,
        name: 'Identity E2E Organization A',
      }),
    );
    orgB = await organizationRepository.save(
      organizationRepository.create({
        folio: `ID-E2E-B-${suffix}`,
        name: 'Identity E2E Organization B',
      }),
    );
    organizationIds.push(orgA.id, orgB.id);

    userA = await userRepository.save(
      userRepository.create({
        name: 'Mapped User A',
        folio: `U-E2E-A-${suffix}`,
        email: `identity-e2e-a-${suffix}@example.test`,
        role_id: role.id,
        role,
        organization_id: orgA.id,
        organization: orgA,
        avatar_url: null,
      }),
    );
    userB = await userRepository.save(
      userRepository.create({
        name: 'Mapped User B',
        folio: `U-E2E-B-${suffix}`,
        email: `identity-e2e-b-${suffix}@example.test`,
        role_id: role.id,
        role,
        organization_id: orgB.id,
        organization: orgB,
        avatar_url: null,
      }),
    );
    userIds.push(userA.id, userB.id);

    portalClient = await clientRepository.save(
      clientRepository.create({
        name: 'Mapped Portal Client',
        folio: `C-E2E-${suffix}`,
        phone_number: '+5215550000000',
        email: `identity-e2e-client-${suffix}@example.test`,
        organization_id: orgB.id,
        organization: orgB,
      }),
    );
    clientIds.push(portalClient.id);

    const mappings = [
      {
        subject: subjectA,
        identity_type: 'user' as const,
        user_id: userA.id,
        client_id: null,
      },
      {
        subject: subjectB,
        identity_type: 'user' as const,
        user_id: userB.id,
        client_id: null,
      },
      {
        subject: portalSubject,
        identity_type: 'portal-client' as const,
        user_id: null,
        client_id: portalClient.id,
      },
    ];
    const savedMappings = await identityRepository.save(
      mappings.map((mapping) =>
        identityRepository.create({ issuer, ...mapping }),
      ),
    );
    externalIdentities = savedMappings.map((identity) => identity.id);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      if (externalIdentities.length) {
        await dataSource
          .getRepository(ExternalIdentity)
          .delete(externalIdentities);
      }
      if (clientIds.length) {
        await dataSource.getRepository(Client).delete(clientIds);
      }
      if (userIds.length) {
        await dataSource.getRepository(User).delete(userIds);
      }
      if (roleId) {
        await dataSource.getRepository(Role).delete(roleId);
      }
      if (organizationIds.length) {
        await dataSource.getRepository(Organization).delete(organizationIds);
      }
    }
    await app?.close();
    if (jwksServer?.listening) {
      await new Promise<void>((resolve, reject) => {
        jwksServer.close((error) => (error ? reject(error) : resolve()));
      });
    }
  });

  it('loads each admin profile and organization from the explicit local mapping', async () => {
    const tokenA = createAccessToken(
      subjectA,
      adminClientId,
      'openid vegyfresh-api',
      {
        role: 'attacker-admin',
        permissions: ['*'],
        org_id: orgB.id,
        email: userB.email,
      },
    );
    const tokenB = createAccessToken(
      subjectB,
      adminClientId,
      'openid vegyfresh-api',
    );

    const profileA = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);
    expect(profileA.body).toMatchObject({
      user: { id: userA.id, email: userA.email },
      organization: { id: orgA.id },
      role: { id: role.id, name: role.name },
    });
    expect(profileA.body).not.toMatchObject({
      organization: { id: orgB.id },
      role: { name: 'attacker-admin' },
    });

    const profileB = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);
    expect(profileB.body).toMatchObject({
      user: { id: userB.id, email: userB.email },
      organization: { id: orgB.id },
      role: { id: role.id, name: role.name },
    });
  });

  it('onboards a new admin as an org-less owner and reuses the same mapping', async () => {
    const subject = `identity-e2e-new-admin-${Date.now().toString(36)}`;
    const email = `New.Owner-${Date.now().toString(36)}@Example.Test`;
    const token = createAccessToken(
      subject,
      adminClientId,
      'openid vegyfresh-api',
      {
        email,
        name: 'New VegyFresh Owner',
        role: 'attacker-admin',
        permissions: ['*'],
        org_id: orgB.id,
      },
    );

    const [first, concurrent] = await Promise.all([
      request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`),
      request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`),
    ]);
    expect(first.status).toBe(200);
    expect(concurrent.status).toBe(200);
    const firstBody = first.body as AuthProfileResponse;
    const concurrentBody = concurrent.body as AuthProfileResponse;
    expect(firstBody.user.id).toBe(concurrentBody.user.id);
    expect(first.body).toMatchObject({
      user: {
        email: email.toLowerCase(),
        name: 'New VegyFresh Owner',
      },
      organization: null,
      role: { name: 'owner' },
    });
    expect(firstBody.role.name).not.toBe('attacker-admin');

    const userId = firstBody.user.id;
    userIds.push(userId);
    const identityRepository = dataSource.getRepository(ExternalIdentity);
    const linkedIdentity = await identityRepository.findOneBy({
      issuer,
      subject,
      identity_type: 'user',
    });
    expect(linkedIdentity).toMatchObject({
      user_id: userId,
      client_id: null,
    });
    if (linkedIdentity) externalIdentities.push(linkedIdentity.id);

    const changedClaimsToken = createAccessToken(
      subject,
      adminClientId,
      'openid vegyfresh-api',
      { email: 'changed@example.test', name: 'Changed Name' },
    );
    const repeated = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${changedClaimsToken}`)
      .expect(200);
    const repeatedBody = repeated.body as AuthProfileResponse;
    expect(repeatedBody.user).toMatchObject({
      id: userId,
      email: email.toLowerCase(),
      name: 'New VegyFresh Owner',
    });

    const organization = await request(app.getHttpServer())
      .post('/api/v1/organizations')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'New Owner Organization' })
      .expect(201);
    const createdOrganization =
      organization.body as CreatedOrganizationResponse;
    organizationIds.push(createdOrganization.id);

    const organizationProfile = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(organizationProfile.body).toMatchObject({
      user: { id: userId },
      organization: { id: createdOrganization.id },
      role: { name: 'owner' },
    });
  });

  it('rejects an existing unlinked email instead of attaching the Keycloak subject', async () => {
    const suffix = Date.now().toString(36);
    const existingEmail = `existing-unlinked-${suffix}@example.test`;
    const userRepository = dataSource.getRepository(User);
    const existingUser = await userRepository.save(
      userRepository.create({
        name: 'Existing Local User',
        folio: `U-E2E-EXIST-${suffix}`,
        email: existingEmail,
        role_id: role.id,
        role,
        organization_id: orgA.id,
        organization: orgA,
        avatar_url: null,
      }),
    );
    userIds.push(existingUser.id);

    const subject = `identity-e2e-email-conflict-${suffix}`;
    const token = createAccessToken(
      subject,
      adminClientId,
      'openid vegyfresh-api',
      { email: existingEmail.toUpperCase(), name: 'Unlinked Login' },
    );
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);

    expect(response.body).toMatchObject({ code: 'USER_NOT_LINKED' });
    expect(
      await dataSource.getRepository(ExternalIdentity).findOneBy({
        issuer,
        subject,
        identity_type: 'user',
      }),
    ).toBeNull();
    expect(
      await userRepository.findOneBy({ email: existingEmail }),
    ).toMatchObject({ id: existingUser.id });
  });

  it('allows only one concurrent admin subject to claim a normalized email', async () => {
    const suffix = Date.now().toString(36);
    const email = `Shared-Admin-${suffix}@example.test`;
    const subjects = [
      `identity-e2e-email-race-a-${suffix}`,
      `identity-e2e-email-race-b-${suffix}`,
    ];
    const tokens = subjects.map((subject, index) =>
      createAccessToken(subject, adminClientId, 'openid vegyfresh-api', {
        email: index === 0 ? email : email.toUpperCase(),
        name: `Concurrent Owner ${index + 1}`,
      }),
    );

    const responses = await Promise.all(
      tokens.map((token) =>
        request(app.getHttpServer())
          .get('/api/v1/auth/me')
          .set('Authorization', `Bearer ${token}`),
      ),
    );
    expect(responses.map(({ status }) => status).sort()).toEqual([200, 403]);

    const winner = responses.find(({ status }) => status === 200);
    const rejected = responses.find(({ status }) => status === 403);
    expect((rejected?.body as { code: string }).code).toBe('USER_NOT_LINKED');

    const profile = winner?.body as AuthProfileResponse | undefined;
    expect(profile?.user.email).toBe(email.toLowerCase());
    expect(profile?.organization).toBeNull();
    if (!profile) throw new Error('The winning admin profile was not returned');
    userIds.push(profile.user.id);

    const identityRepository = dataSource.getRepository(ExternalIdentity);
    const linkedIdentities = await Promise.all(
      subjects.map((subject) =>
        identityRepository.findOneBy({
          issuer,
          subject,
          identity_type: 'user',
        }),
      ),
    );
    const winnerIdentity = linkedIdentities.find((identity) => identity);
    expect(linkedIdentities.filter(Boolean)).toHaveLength(1);
    if (winnerIdentity) externalIdentities.push(winnerIdentity.id);
  });

  it('rolls back the new user when saving its external identity fails', async () => {
    const suffix = Date.now().toString(36);
    const subject = `identity-e2e-rollback-${suffix}`;
    const email = `rollback-${suffix}@example.test`;
    const token = createAccessToken(
      subject,
      adminClientId,
      'openid vegyfresh-api',
      { email, name: 'Rollback User' },
    );

    try {
      await dataSource.query(`
        CREATE FUNCTION test_reject_identity_insert() RETURNS trigger
        LANGUAGE plpgsql AS $function$
        BEGIN
          IF NEW.subject LIKE 'identity-e2e-rollback-%' THEN
            RAISE EXCEPTION 'Forced E2E identity insert failure'
              USING ERRCODE = '23514';
          END IF;
          RETURN NEW;
        END;
        $function$
      `);
      await dataSource.query(`
        CREATE TRIGGER test_reject_identity_insert
        BEFORE INSERT ON external_identities
        FOR EACH ROW EXECUTE FUNCTION test_reject_identity_insert()
      `);

      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(500);
    } finally {
      await dataSource.query(
        'DROP TRIGGER IF EXISTS test_reject_identity_insert ON external_identities',
      );
      await dataSource.query(
        'DROP FUNCTION IF EXISTS test_reject_identity_insert()',
      );
    }

    expect(
      await dataSource.getRepository(User).findOneBy({ email }),
    ).toBeNull();
    expect(
      await dataSource.getRepository(ExternalIdentity).findOneBy({
        issuer,
        subject,
        identity_type: 'user',
      }),
    ).toBeNull();
  });

  it('does not provision an admin before the token has the API scope', async () => {
    const subject = `identity-e2e-missing-scope-${Date.now().toString(36)}`;
    const email = `missing-scope-${Date.now().toString(36)}@example.test`;
    const token = createAccessToken(
      subject,
      adminClientId,
      'openid profile email',
      { email, name: 'Missing Scope' },
    );

    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(
      await dataSource.getRepository(ExternalIdentity).findOneBy({
        issuer,
        subject,
        identity_type: 'user',
      }),
    ).toBeNull();
    expect(
      await dataSource.getRepository(User).findOneBy({ email }),
    ).toBeNull();
  });

  it('does not auto-provision a portal subject', async () => {
    const subject = `identity-e2e-unmapped-portal-${Date.now().toString(36)}`;
    const email = `unmapped-portal-${Date.now().toString(36)}@example.test`;
    const token = createAccessToken(
      subject,
      portalClientId,
      'openid vegyfresh-api vegyfresh-portal',
      { email, name: 'Unmapped Portal Client' },
    );

    await request(app.getHttpServer())
      .get('/api/v1/portal/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
    expect(
      await dataSource.getRepository(ExternalIdentity).findOneBy({
        issuer,
        subject,
        identity_type: 'portal-client',
      }),
    ).toBeNull();
    expect(
      await dataSource.getRepository(User).findOneBy({ email }),
    ).toBeNull();
  });

  it('persists a user profile without a local password hash', async () => {
    const userRepository = dataSource.getRepository(User);
    const user = await userRepository.save(
      userRepository.create({
        name: 'Passwordless User',
        folio: `U-E2E-PW-${Date.now().toString(36)}`,
        email: `identity-e2e-passwordless-${Date.now().toString(36)}@example.test`,
        role_id: role.id,
        role,
        organization_id: orgA.id,
        organization: orgA,
        avatar_url: null,
      }),
    );
    userIds.push(user.id);

    const rows = await dataSource.query<
      Array<{ password_hash: string | null }>
    >('SELECT "password_hash" FROM "users" WHERE "id" = $1', [user.id]);
    expect(rows[0]?.password_hash).toBeNull();
  });

  it('does not expose local signup, login, or refresh endpoints', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/signup')
      .send({ name: 'New User', email: 'new@example.test', password: 'secret' })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: userA.email, password: 'unused-local-password' })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refresh_token: 'unused-local-refresh-token' })
      .expect(404);

    await request(app.getHttpServer()).post('/api/v1/auth/logout').expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/portal/auth/login')
      .send({ email: portalClient.email, password: 'unused-local-password' })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/portal/auth/refresh')
      .send({ refresh_token: 'unused-local-refresh-token' })
      .expect(404);

    await request(app.getHttpServer())
      .post('/api/v1/portal/auth/logout')
      .expect(404);
  });

  it('does not link an existing local user by email alone', async () => {
    const token = createAccessToken(
      `unmapped-${Date.now().toString(36)}`,
      adminClientId,
      'openid vegyfresh-api',
      { email: userA.email },
    );

    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
    expect((response.body as { code: string }).code).toBe('USER_NOT_LINKED');
  });

  it('isolates portal identities from admin identities', async () => {
    const adminToken = createAccessToken(
      subjectA,
      adminClientId,
      'openid vegyfresh-api',
    );

    await request(app.getHttpServer())
      .get('/api/v1/portal/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(401);
  });

  it('loads portal profiles only with the portal client and portal scope', async () => {
    const token = createAccessToken(
      portalSubject,
      portalClientId,
      'openid vegyfresh-api vegyfresh-portal',
      { org_id: orgA.id, email: userA.email, role: 'admin' },
    );

    const profile = await request(app.getHttpServer())
      .get('/api/v1/portal/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(profile.body).toEqual({
      client: {
        id: portalClient.id,
        name: portalClient.name,
        email: portalClient.email,
        portalEnabled: true,
      },
    });

    const missingScopeToken = createAccessToken(
      portalSubject,
      portalClientId,
      'openid vegyfresh-api',
    );
    await request(app.getHttpServer())
      .get('/api/v1/portal/auth/me')
      .set('Authorization', `Bearer ${missingScopeToken}`)
      .expect(401);
  });
});
