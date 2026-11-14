import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { IdentityService } from '../identity.service';
import {
  createKeycloakPassportOptions,
  KeycloakAuthSettings,
  resolveKeycloakSettings,
  validateKeycloakClientClaims,
} from '../keycloak-auth.config';

function tokenClaims(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new UnauthorizedException('Invalid Keycloak token claims');
  }
  return payload as Record<string, unknown>;
}

@Injectable()
export class KeycloakAccessStrategy extends PassportStrategy(
  Strategy,
  'keycloak-access',
) {
  private readonly settings: KeycloakAuthSettings;

  constructor(
    config: ConfigService,
    private readonly identity: IdentityService,
  ) {
    const settings = resolveKeycloakSettings(config);
    super(createKeycloakPassportOptions(settings));
    this.settings = settings;
  }

  async validate(payload: unknown) {
    const claims = tokenClaims(payload);
    validateKeycloakClientClaims(claims, this.settings, 'admin');
    return this.identity.resolveAdminUser(claims.iss, claims.sub, {
      email: claims.email,
      name: claims.name,
      preferred_username: claims.preferred_username,
    });
  }
}

@Injectable()
export class KeycloakPortalStrategy extends PassportStrategy(
  Strategy,
  'keycloak-portal',
) {
  private readonly settings: KeycloakAuthSettings;

  constructor(
    config: ConfigService,
    private readonly identity: IdentityService,
  ) {
    const settings = resolveKeycloakSettings(config);
    super(createKeycloakPassportOptions(settings));
    this.settings = settings;
  }

  async validate(payload: unknown) {
    const claims = tokenClaims(payload);
    validateKeycloakClientClaims(claims, this.settings, 'portal');
    return this.identity.resolvePortalClient(claims.iss, claims.sub);
  }
}
