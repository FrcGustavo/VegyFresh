import { JwtService } from '@nestjs/jwt';
import { generateKeyPairSync } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { Strategy } from 'passport-jwt';
import {
  createKeycloakPassportOptions,
  KeycloakAuthSettings,
  resolveKeycloakSettings,
  validateKeycloakClientClaims,
} from 'src/identity/keycloak-auth.config';

const { privateKey, publicKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
});
const otherKey = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey;
const jwt = new JwtService();
let server: Server;
let settings: KeycloakAuthSettings;

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
    adminScope: 'vegyfresh-api',
    portalScope: 'vegyfresh-portal',
    jwksUri: `http://127.0.0.1:${port}/certs`,
  };
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

function token(claims: Record<string, unknown> = {}, key = privateKey): string {
  const payload: Record<string, unknown> = {
    sub: 'subject',
    iss: settings.issuer,
    aud: settings.audience,
    exp: Math.floor(Date.now() / 1000) + 300,
    azp: settings.adminClientId,
    scope: 'openid vegyfresh-api',
    typ: 'Bearer',
    ...claims,
  };
  if (payload.exp === undefined) delete payload.exp;
  return jwt.sign(payload, {
    privateKey: key.export({ type: 'pkcs8', format: 'pem' }),
    algorithm: 'RS256',
    keyid: 'test-key',
  });
}

function authenticate(raw: string, kind: 'admin' | 'portal'): Promise<boolean> {
  const strategy = new Strategy(
    createKeycloakPassportOptions(settings),
    (payload: unknown, done) => {
      try {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload))
          return done(null, false);
        validateKeycloakClientClaims(
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
    strategy.authenticate({ headers: { authorization: `Bearer ${raw}` } }, {});
  });
}

describe('Keycloak JWT and JWKS validation', () => {
  it('accepts signed admin and portal access tokens for their own clients', async () => {
    expect(await authenticate(token(), 'admin')).toBe(true);
    expect(
      await authenticate(
        token({
          azp: settings.portalClientId,
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

  it('rejects invalid subject, token type, client, and scope', async () => {
    for (const claims of [
      { sub: '' },
      { sub: 'x'.repeat(256) },
      { typ: 'ID' },
      { azp: settings.portalClientId },
      { scope: 'openid' },
    ])
      expect(await authenticate(token(claims), 'admin')).toBe(false);
  });

  it('rejects cross-client tokens and requires the portal scope', async () => {
    expect(await authenticate(token(), 'portal')).toBe(false);
    expect(
      await authenticate(token({ azp: settings.portalClientId }), 'portal'),
    ).toBe(false);
    expect(
      await authenticate(
        token({
          azp: settings.portalClientId,
          scope: 'vegyfresh-api vegyfresh-portal',
        }),
        'admin',
      ),
    ).toBe(false);
  });
});

describe('Keycloak settings', () => {
  it('derives the standard JWKS endpoint and client defaults', () => {
    const config = {
      get: (key: string) =>
        key === 'KEYCLOAK_ISSUER'
          ? 'https://identity.example/realm/'
          : undefined,
    };
    expect(resolveKeycloakSettings(config as never)).toMatchObject({
      jwksUri: 'https://identity.example/realm/protocol/openid-connect/certs',
      audience: 'vegyfresh-api',
      adminClientId: 'vegyfresh-admin',
      portalClientId: 'vegyfresh-portal',
    });
  });

  it('rejects missing or unsafe endpoint configuration', () => {
    for (const issuer of [
      undefined,
      'relative',
      'https://user:pass@example.com/realm',
      'https://example.com/realm?x=1',
    ]) {
      const config = {
        get: (key: string) => (key === 'KEYCLOAK_ISSUER' ? issuer : undefined),
      };
      expect(() => resolveKeycloakSettings(config as never)).toThrow();
    }
  });
});
