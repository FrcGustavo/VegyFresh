import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { passportJwtSecret } from 'jwks-rsa';
import { ExtractJwt } from 'passport-jwt';
import type { SecretOrKeyProvider } from 'passport-jwt';

export type OidcClientKind = 'admin' | 'portal';
export type OidcAuthSettings = {
  issuer: string;
  audience: string;
  jwksUri: string;
  adminClientId: string;
  portalClientId: string;
  provisioningSecret: string;
};

function required(config: ConfigService, key: string): string {
  const value = config.get<string>(key);
  if (!value?.trim())
    throw new InternalServerErrorException(`${key} is required`);
  return value;
}

function oidcUrl(value: string, key: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new InternalServerErrorException(`${key} must be an absolute URL`);
  }
  if (
    !['https:', 'http:'].includes(url.protocol) ||
    !url.hostname ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.href !== value ||
    (url.protocol === 'http:' &&
      !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
  ) {
    throw new InternalServerErrorException(
      `${key} must be an HTTPS URL (HTTP is allowed on loopback)`,
    );
  }
}

export function resolveOidcSettings(config: ConfigService): OidcAuthSettings {
  const issuer = required(config, 'OIDC_ISSUER');
  const jwksUri = required(config, 'OIDC_JWKS_URI');
  oidcUrl(issuer, 'OIDC_ISSUER');
  oidcUrl(jwksUri, 'OIDC_JWKS_URI');
  const provisioningSecret = required(config, 'OIDC_PROVISIONING_SECRET');
  if (Buffer.byteLength(provisioningSecret) < 32)
    throw new InternalServerErrorException(
      'OIDC_PROVISIONING_SECRET must contain at least 32 bytes',
    );
  const adminClientId = required(config, 'OIDC_ADMIN_CLIENT_ID');
  const portalClientId = required(config, 'OIDC_PORTAL_CLIENT_ID');
  if (adminClientId === portalClientId)
    throw new InternalServerErrorException('OIDC client IDs must differ');
  return {
    issuer,
    jwksUri,
    audience: required(config, 'OIDC_API_AUDIENCE'),
    adminClientId,
    portalClientId,
    provisioningSecret,
  };
}

export function createOidcPassportOptions(
  settings: OidcAuthSettings,
  jwksProvider: SecretOrKeyProvider = passportJwtSecret({
    jwksUri: settings.jwksUri,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    timeout: 5_000,
  }),
) {
  const secretOrKeyProvider: SecretOrKeyProvider = (
    request,
    rawToken,
    done,
  ) => {
    try {
      const encodedToken: unknown = rawToken;
      if (typeof encodedToken !== 'string')
        throw new Error('Invalid access token header');
      const header = JSON.parse(
        Buffer.from(encodedToken.split('.')[0], 'base64url').toString(),
      ) as Record<string, unknown>;
      if (
        (header.typ !== 'at+jwt' && header.typ !== 'application/at+jwt') ||
        header.alg !== 'RS256'
      )
        throw new Error('Invalid access token header');
      jwksProvider(request, rawToken, done);
    } catch {
      done(new Error('Invalid access token header'), undefined);
    }
  };
  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    issuer: settings.issuer,
    audience: settings.audience,
    algorithms: ['RS256'] as ['RS256'],
    secretOrKeyProvider,
  };
}

export function validateOidcClientClaims(
  payload: Record<string, unknown>,
  settings: OidcAuthSettings,
  kind: OidcClientKind,
): asserts payload is Record<string, unknown> & {
  sub: string;
  iss: string;
  client_id: string;
} {
  if (
    typeof payload.sub !== 'string' ||
    !payload.sub.trim() ||
    payload.sub.length > 255 ||
    payload.iss !== settings.issuer ||
    payload.client_id !==
      (kind === 'admin' ? settings.adminClientId : settings.portalClientId) ||
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= Date.now() / 1000 ||
    typeof payload.iat !== 'number' ||
    !Number.isFinite(payload.iat) ||
    typeof payload.jti !== 'string' ||
    !payload.jti.trim() ||
    payload.sub.endsWith('@clients') ||
    payload.sub === payload.client_id ||
    payload.act !== undefined ||
    (payload.sub_profile !== undefined && payload.sub_profile !== 'user')
  ) {
    throw new UnauthorizedException('Invalid OIDC user access token');
  }
}
