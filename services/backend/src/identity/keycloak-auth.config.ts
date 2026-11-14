import {
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRequire } from 'node:module';
import { ExtractJwt } from 'passport-jwt';
import type { SecretOrKeyProvider } from 'passport-jwt';

export type KeycloakClientKind = 'admin' | 'portal';

export type KeycloakAuthSettings = {
  issuer: string;
  audience: string;
  adminClientId: string;
  portalClientId: string;
  adminScope: string;
  portalScope: string;
  jwksUri: string;
};

export function resolveKeycloakSettings(
  config: ConfigService,
): KeycloakAuthSettings {
  const authProvider =
    config.get<string>('AUTH_PROVIDER') ??
    config.get<string>('config.authProvider');
  if (authProvider !== undefined && authProvider !== 'keycloak') {
    throw new InternalServerErrorException(
      'AUTH_PROVIDER must be keycloak; local authentication is not supported',
    );
  }

  const issuer =
    config.get<string>('KEYCLOAK_ISSUER') ??
    config.get<string>('config.keycloak.issuer');
  const audience =
    config.get<string>('KEYCLOAK_AUDIENCE') ??
    config.get<string>('config.keycloak.audience') ??
    'vegyfresh-api';

  if (!issuer) {
    throw new InternalServerErrorException(
      'KEYCLOAK_ISSUER is required for API authentication',
    );
  }

  parseOidcUrl(issuer, 'KEYCLOAK_ISSUER');
  const jwksUri =
    config.get<string>('KEYCLOAK_JWKS_URI') ??
    `${issuer.replace(/\/+$/, '')}/protocol/openid-connect/certs`;
  parseOidcUrl(jwksUri, 'KEYCLOAK_JWKS_URI');
  if (!audience.trim()) {
    throw new InternalServerErrorException(
      'KEYCLOAK_AUDIENCE must not be empty',
    );
  }

  return {
    issuer,
    audience,
    adminClientId:
      config.get<string>('KEYCLOAK_ADMIN_CLIENT_ID') ?? 'vegyfresh-admin',
    portalClientId:
      config.get<string>('KEYCLOAK_PORTAL_CLIENT_ID') ?? 'vegyfresh-portal',
    adminScope: config.get<string>('KEYCLOAK_ADMIN_SCOPE') ?? 'vegyfresh-api',
    portalScope:
      config.get<string>('KEYCLOAK_PORTAL_SCOPE') ?? 'vegyfresh-portal',
    jwksUri,
  };
}

export function createKeycloakPassportOptions(
  settings: KeycloakAuthSettings,
  audience = settings.audience,
  secretOrKeyProvider: SecretOrKeyProvider = createJwksSecretProvider(
    settings.jwksUri,
  ),
) {
  return {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    ignoreExpiration: false,
    issuer: settings.issuer,
    audience,
    algorithms: ['RS256'] as ['RS256'],
    secretOrKeyProvider,
  };
}

function createJwksSecretProvider(jwksUri: string): SecretOrKeyProvider {
  // Load the JWKS client only when a Keycloak strategy is constructed.
  const requireFromBackend = createRequire(__filename);
  const { passportJwtSecret } = requireFromBackend(
    'jwks-rsa',
  ) as typeof import('jwks-rsa');
  return passportJwtSecret({
    jwksUri,
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 10,
    timeout: 5_000,
  });
}

function parseOidcUrl(value: string, setting: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new InternalServerErrorException(
      `${setting} must be an absolute URL`,
    );
  }

  if (
    !['http:', 'https:'].includes(parsed.protocol) ||
    !parsed.hostname ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new InternalServerErrorException(
      `${setting} must be an HTTP(S) URL without credentials, query, or fragment`,
    );
  }
  return parsed;
}

export function validateKeycloakClientClaims(
  payload: Record<string, unknown>,
  settings: KeycloakAuthSettings,
  kind: KeycloakClientKind,
): asserts payload is Record<string, unknown> & {
  sub: string;
  iss: string;
  azp: string;
  scope: string;
  exp: number;
  typ: 'Bearer';
} {
  const clientId =
    kind === 'admin' ? settings.adminClientId : settings.portalClientId;
  const requiredScopes = [settings.adminScope];
  if (kind === 'portal') requiredScopes.push(settings.portalScope);

  if (
    typeof payload.sub !== 'string' ||
    payload.sub.trim().length === 0 ||
    payload.sub.length > 255 ||
    payload.iss !== settings.issuer ||
    payload.azp !== clientId ||
    payload.typ !== 'Bearer' ||
    typeof payload.exp !== 'number' ||
    !Number.isFinite(payload.exp) ||
    payload.exp <= Date.now() / 1_000
  ) {
    throw new UnauthorizedException('Invalid Keycloak token client context');
  }

  const scopes =
    typeof payload.scope === 'string' ? payload.scope.split(/\s+/) : [];
  if (requiredScopes.some((scope) => !scopes.includes(scope))) {
    throw new UnauthorizedException(
      'Keycloak token is missing a required scope',
    );
  }
}
