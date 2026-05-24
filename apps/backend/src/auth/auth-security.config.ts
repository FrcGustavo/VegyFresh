import type { ConfigService } from '@nestjs/config';

const DURATION_REGEX = /^(\d+)(ms|s|m|h|d)$/i;
const MIN_SECRET_LENGTH = 32;

export const DEFAULT_ACCESS_TOKEN_TTL = '15m';
export const DEFAULT_REFRESH_TOKEN_TTL = '7d';
export const DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 86_400_000;
export const MIN_ACCESS_TOKEN_TTL_MS = 60_000;
export const MAX_ACCESS_TOKEN_TTL_MS = 24 * 3_600_000;
export const MIN_REFRESH_TOKEN_TTL_MS = 3_600_000;
export const MAX_REFRESH_TOKEN_TTL_MS = 30 * 86_400_000;
export const DEFAULT_BCRYPT_SALT_ROUNDS = 12;
export const MIN_BCRYPT_SALT_ROUNDS = 10;

export function parseDurationToMs(raw: string): number | null {
  const value = raw.trim().toLowerCase();
  const matched = value.match(DURATION_REGEX);
  if (!matched) {
    return null;
  }

  const amount = Number(matched[1]);
  const unit = matched[2];
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multipliers[unit];
}

export function resolveJwtSecret(
  configService: ConfigService,
  primaryKey: 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET',
): string {
  const secret =
    configService.get<string>(primaryKey) ??
    configService.get<string>('jwtSecret') ??
    '';
  const normalized = secret.trim();

  if (normalized.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${primaryKey} (or JWT_SECRET fallback) must be at least ${MIN_SECRET_LENGTH} characters`,
    );
  }

  return normalized;
}

export function resolveTokenTtl(
  configService: ConfigService,
  key: 'JWT_ACCESS_TTL' | 'JWT_REFRESH_TTL',
  fallback: string,
  minMs: number,
  maxMs: number,
): string {
  const raw = (configService.get<string>(key) ?? fallback).trim();
  const duration = parseDurationToMs(raw);

  if (!duration || duration < minMs || duration > maxMs) {
    return fallback;
  }

  return raw;
}

export function resolveBcryptSaltRounds(configService: ConfigService): number {
  const raw =
    configService.get<string>('BCRYPT_SALT_ROUNDS') ??
    configService.get<number>('config.bcryptSaltRounds');
  const parsed = Number(raw);

  if (!Number.isInteger(parsed) || parsed < MIN_BCRYPT_SALT_ROUNDS) {
    return DEFAULT_BCRYPT_SALT_ROUNDS;
  }

  return parsed;
}
