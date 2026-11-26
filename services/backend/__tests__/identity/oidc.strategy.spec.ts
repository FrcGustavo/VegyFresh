import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { generateKeyPairSync } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { IdentityService } from 'src/identity/identity.service';
import {
  OidcAccessStrategy,
  OidcPortalStrategy,
  OidcProvisioningStrategy,
} from 'src/identity/strategies/oidc.strategy';

const issuer = 'https://identity.example/realms/vegyfresh';
const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const jwt = new JwtService();
const identities = { findOne: jest.fn() };
const users = { findOne: jest.fn() };
const clients = { findOne: jest.fn() };
const identity = new IdentityService(
  {} as never,
  identities as never,
  users as never,
  clients as never,
);
let server: Server;
let admin: OidcAccessStrategy;
let portal: OidcPortalStrategy;
let provisioning: OidcProvisioningStrategy;

beforeAll(async () => {
  server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        keys: [
          {
            ...publicKey.export({ format: 'jwk' }),
            kid: 'test',
            use: 'sig',
            alg: 'RS256',
          },
        ],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const config = {
    get: (key: string) =>
      ({
        OIDC_ISSUER: issuer,
        OIDC_JWKS_URI: `http://127.0.0.1:${port}/certs`,
        OIDC_API_AUDIENCE: 'vegyfresh-api',
        OIDC_ADMIN_CLIENT_ID: 'vegyfresh-admin',
        OIDC_PORTAL_CLIENT_ID: 'vegyfresh-portal',
        OIDC_PROVISIONING_SECRET: 'test-provisioning-secret-at-least-32-bytes',
      })[key],
  };
  admin = new OidcAccessStrategy(config as never, identity);
  portal = new OidcPortalStrategy(config as never, identity);
  provisioning = new OidcProvisioningStrategy(config as never);
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

beforeEach(() => jest.resetAllMocks());

function token(claims: Record<string, unknown> = {}) {
  return jwt.sign(
    {
      sub: 'external-subject',
      iss: issuer,
      aud: 'vegyfresh-api',
      client_id: 'vegyfresh-admin',
      jti: 'test-jti',
      scope: 'openid vegyfresh-api',
      exp: Math.floor(Date.now() / 1000) + 300,
      email: 'token@example.test',
      realm_access: { roles: ['owner'] },
      ...claims,
    },
    {
      privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
      algorithm: 'RS256',
      keyid: 'test',
      header: { typ: 'at+jwt', alg: 'RS256' },
    },
  );
}

function authenticate(
  strategy: OidcAccessStrategy | OidcPortalStrategy | OidcProvisioningStrategy,
  raw: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    strategy.success = resolve;
    strategy.fail = () => reject(new Error('Authentication failed'));
    strategy.error = reject;
    strategy.authenticate(
      { headers: { authorization: `Bearer ${raw}` } } as Request,
      {},
    );
  });
}

describe('OIDC strategy adapters', () => {
  it('resolves a verified admin token to database permissions and organization', async () => {
    identities.findOne.mockResolvedValue({ user_id: 'user-1' });
    users.findOne.mockResolvedValue({
      id: 'user-1',
      email: 'db@example.test',
      organization_id: 'org-1',
      organization: { id: 'org-1' },
      role: {
        name: 'viewer',
        permissions: [{ resource: 'orders', action: 'read' }],
      },
    });
    await expect(authenticate(admin, token())).resolves.toEqual({
      sub: 'user-1',
      email: 'db@example.test',
      org_id: 'org-1',
      role: 'viewer',
      permissions: ['orders:read'],
    });
    expect(identities.findOne).toHaveBeenCalledWith({
      where: { issuer, subject: 'external-subject', identity_type: 'user' },
    });
  });

  it('resolves a verified portal token to its linked client', async () => {
    identities.findOne.mockResolvedValue({ client_id: 'client-1' });
    clients.findOne.mockResolvedValue({
      id: 'client-1',
      email: 'db@example.test',
      organization_id: 'org-2',
      organization: { id: 'org-2' },
    });
    await expect(
      authenticate(
        portal,
        token({
          client_id: 'vegyfresh-portal',
          scope: 'vegyfresh-api vegyfresh-portal',
        }),
      ),
    ).resolves.toEqual({
      sub: 'client-1',
      email: 'db@example.test',
      organization_id: 'org-2',
      type: 'portal-client',
    });
    expect(identities.findOne).toHaveBeenCalledWith({
      where: {
        issuer,
        subject: 'external-subject',
        identity_type: 'portal-client',
      },
    });
  });

  it('rejects cross-client tokens before identity lookup', async () => {
    await expect(authenticate(portal, token())).rejects.toThrow();
    await expect(
      authenticate(
        admin,
        token({
          client_id: 'vegyfresh-portal',
          scope: 'vegyfresh-api vegyfresh-portal',
        }),
      ),
    ).rejects.toThrow();
    expect(identities.findOne).not.toHaveBeenCalled();
  });

  it('resolves only linked admin identities after validation', async () => {
    const resolve = jest
      .spyOn(identity, 'resolveLinkedAdminUser')
      .mockResolvedValueOnce({
        sub: 'new-user',
        email: 'token@example.test',
        org_id: '',
        role: 'owner',
        permissions: ['*'],
      });
    await expect(authenticate(admin, token())).resolves.toMatchObject({
      sub: 'new-user',
    });
    expect(resolve).toHaveBeenCalledWith(issuer, 'external-subject');
    resolve.mockRestore();
    await expect(authenticate(provisioning, token())).resolves.toEqual({
      issuer,
      subject: 'external-subject',
    });
  });
});
