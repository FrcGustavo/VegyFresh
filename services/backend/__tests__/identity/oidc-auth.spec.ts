import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { generateKeyPairSync } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { Strategy } from 'passport-jwt';
import {
  createOidcPassportOptions,
  OidcAuthSettings,
  resolveOidcSettings,
  validateOidcClientClaims,
} from 'src/identity/oidc-auth.config';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const jwt = new JwtService();
let server: Server;
let settings: OidcAuthSettings;

beforeAll(async () => {
  const jwk = publicKey.export({ format: 'jwk' });
  server = createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        keys: [{ ...jwk, kid: 'test-key', use: 'sig', alg: 'RS256' }],
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  settings = {
    issuer: 'https://identity.example/realms/vegyfresh',
    audience: 'vegyfresh-api',
    adminClientId: 'vegyfresh-admin',
    portalClientId: 'vegyfresh-portal',
    provisioningSecret: 'test-provisioning-secret-more-than-32-bytes',
    jwksUri: `http://127.0.0.1:${port}/certs`,
  };
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function token(
  claims: Record<string, unknown> = {},
  key = privateKey,
  type = 'at+jwt',
): string {
  const payload: Record<string, unknown> = {
    sub: 'subject',
    iss: settings.issuer,
    aud: settings.audience,
    exp: Math.floor(Date.now() / 1000) + 300,
    client_id: settings.adminClientId,
    jti: 'test-jti',
    scope: 'openid vegyfresh-api',
    ...claims,
  };
  if (payload.exp === undefined) delete payload.exp;
  return jwt.sign(payload, {
    privateKey: key.export({ type: 'pkcs8', format: 'pem' }),
    algorithm: 'RS256',
    keyid: 'test-key',
    header: { typ: type, alg: 'RS256' },
  });
}

function authenticate(raw: string, kind: 'admin' | 'portal'): Promise<boolean> {
  const strategy = new Strategy(
    createOidcPassportOptions(settings),
    (payload: unknown, done) => {
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload))
          return done(null, false);
        validateOidcClientClaims(
          payload as Record<string, unknown>,
          settings,
          kind,
        );
        return done(null, payload);
      } catch {
        return done(null, false);
      }
    },
  );
  return new Promise((resolve) => {
    strategy.success = () => resolve(true);
    strategy.fail = () => resolve(false);
    strategy.error = () => resolve(false);
    strategy.authenticate(
      { headers: { authorization: `Bearer ${raw}` } } as Request,
      {},
    );
  });
}

describe('OIDC JWT and JWKS validation', () => {
  it('accepts signed admin and portal access tokens for their own clients', async () => {
    expect(await authenticate(token(), 'admin')).toBe(true);
    expect(
      await authenticate(
        token({
          client_id: settings.portalClientId,
          scope: 'openid vegyfresh-api vegyfresh-portal',
        }),
        'portal',
      ),
    ).toBe(true);
  });

  it('rejects a wrong signature, issuer, audience, or expiration', async () => {
    const payload: unknown = jwt.decode(token());
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Expected object claims in the generated test token');
    }
    for (const invalid of [
      token({}, otherKey),
      jwt.sign(payload, {
        secret: 'test-secret',
        algorithm: 'HS256',
        keyid: 'test-key',
      }),
      token({ iss: 'https://other.example/realm' }),
      token({ aud: 'other-api' }),
      token({ exp: Math.floor(Date.now() / 1000) - 1 }),
      token({ exp: undefined }),
    ])
      expect(await authenticate(invalid, 'admin')).toBe(false);
  });

  it('rejects invalid subjects, client IDs and non-user access tokens', async () => {
    for (const claims of [
      { sub: '' },
      { sub: 'x'.repeat(256) },
      { client_id: 'other-client' },
      { client_id: settings.portalClientId },
      { sub: 'vegyfresh-admin@clients' },
    ])
      expect(await authenticate(token(claims), 'admin')).toBe(false);
  });

  it('requires the RFC 9068 access token header type', async () => {
    expect(await authenticate(token({}, privateKey, 'JWT'), 'admin')).toBe(
      false,
    );
    expect(
      await authenticate(token({}, privateKey, 'application/at+jwt'), 'admin'),
    ).toBe(true);
  });

  it('rejects cross-client tokens', async () => {
    expect(await authenticate(token(), 'portal')).toBe(false);
    expect(
      await authenticate(
        token({
          client_id: settings.portalClientId,
          scope: 'vegyfresh-api vegyfresh-portal',
        }),
        'admin',
      ),
    ).toBe(false);
  });
});

describe('OIDC settings', () => {
  it('requires explicit endpoints and distinct clients', () => {
    const values: Record<string, string> = {
      OIDC_ISSUER: settings.issuer,
      OIDC_JWKS_URI: settings.jwksUri,
      OIDC_API_AUDIENCE: settings.audience,
      OIDC_ADMIN_CLIENT_ID: settings.adminClientId,
      OIDC_PORTAL_CLIENT_ID: settings.portalClientId,
      OIDC_PROVISIONING_SECRET: settings.provisioningSecret,
    };
    expect(
      resolveOidcSettings({ get: (key: string) => values[key] } as never),
    ).toEqual(settings);
    expect(() =>
      resolveOidcSettings({
        get: (key: string) =>
          key === 'OIDC_PORTAL_CLIENT_ID'
            ? values.OIDC_ADMIN_CLIENT_ID
            : values[key],
      } as never),
    ).toThrow();
    expect(() =>
      resolveOidcSettings({
        get: (key: string) =>
          key === 'OIDC_ISSUER' ? 'http://example.com/' : values[key],
      } as never),
    ).toThrow();
  });
});
