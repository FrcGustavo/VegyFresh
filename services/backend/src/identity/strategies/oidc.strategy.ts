import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { IdentityService } from '../identity.service';
import {
  createOidcPassportOptions,
  OidcAuthSettings,
  resolveOidcSettings,
  validateOidcClientClaims,
} from '../oidc-auth.config';

function tokenClaims(payload: unknown): Record<string, unknown> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new UnauthorizedException('Invalid OIDC token claims');
  return payload as Record<string, unknown>;
}

@Injectable()
export class OidcAccessStrategy extends PassportStrategy(
  Strategy,
  'oidc-access',
) {
  private readonly settings: OidcAuthSettings;
  constructor(
    config: ConfigService,
    private readonly identity: IdentityService,
  ) {
    const settings = resolveOidcSettings(config);
    super(createOidcPassportOptions(settings));
    this.settings = settings;
  }
  async validate(payload: unknown) {
    const claims = tokenClaims(payload);
    validateOidcClientClaims(claims, this.settings, 'admin');
    return this.identity.resolveLinkedAdminUser(claims.iss, claims.sub);
  }
}

@Injectable()
export class OidcProvisioningStrategy extends PassportStrategy(
  Strategy,
  'oidc-provisioning',
) {
  private readonly settings: OidcAuthSettings;
  constructor(config: ConfigService) {
    const settings = resolveOidcSettings(config);
    super(createOidcPassportOptions(settings));
    this.settings = settings;
  }
  validate(payload: unknown) {
    const claims = tokenClaims(payload);
    validateOidcClientClaims(claims, this.settings, 'admin');
    return { issuer: claims.iss, subject: claims.sub };
  }
}

@Injectable()
export class OidcPortalStrategy extends PassportStrategy(
  Strategy,
  'oidc-portal',
) {
  private readonly settings: OidcAuthSettings;
  constructor(
    config: ConfigService,
    private readonly identity: IdentityService,
  ) {
    const settings = resolveOidcSettings(config);
    super(createOidcPassportOptions(settings));
    this.settings = settings;
  }
  async validate(payload: unknown) {
    const claims = tokenClaims(payload);
    validateOidcClientClaims(claims, this.settings, 'portal');
    return this.identity.resolvePortalClient(claims.iss, claims.sub);
  }
}
