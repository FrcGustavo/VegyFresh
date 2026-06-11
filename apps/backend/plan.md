# Complete Plan: Explain security constants in `auth-security.config.ts`

## 1) Objective
Provide a clear, complete explanation of the purpose of these definitions in:
`apps/backend/src/auth/auth-security.config.ts`

Requested definitions:
- `DURATION_REGEX`
- `MIN_SECRET_LENGTH`
- `DEFAULT_ACCESS_TOKEN_TTL`
- `DEFAULT_REFRESH_TOKEN_TTL`
- `DEFAULT_REFRESH_TOKEN_TTL_MS`
- `MIN_ACCESS_TOKEN_TTL_MS`
- `MAX_ACCESS_TOKEN_TTL_MS`
- `MIN_REFRESH_TOKEN_TTL_MS`
- `MAX_REFRESH_TOKEN_TTL_MS`
- `DEFAULT_BCRYPT_SALT_ROUNDS`
- `MIN_BCRYPT_SALT_ROUNDS`

---

## 2) Scope
In scope:
- Explain **what each constant means**
- Explain **where each constant is used**
- Explain **why it exists** (security/operational guardrail)
- Explain **fallback behavior** when config values are invalid

Out of scope:
- Changing any code
- Changing default values
- Adding new config keys

---

## 3) Source-of-truth mapping in code
Constants are defined at file top and consumed by:

1. `parseDurationToMs(raw)`
2. `resolveJwtSecret(configService, primaryKey)`
3. `resolveTokenTtl(configService, key, fallback, minMs, maxMs)`
4. `resolveBcryptSaltRounds(configService)`

This mapping is the basis for the explanation.

---

## 4) Detailed explanation plan (constant by constant)

### A. Duration format validation
1. `DURATION_REGEX = /^(\d+)(ms|s|m|h|d)$/i`
   - Purpose: only allow strict duration strings like `15m`, `7d`, `30s`, `500ms`.
   - Used by: `parseDurationToMs`.
   - Security/robustness role: rejects malformed TTL strings early.

### B. JWT signing secret hardening
2. `MIN_SECRET_LENGTH = 32`
   - Purpose: enforce minimum entropy/length for JWT signing secrets.
   - Used by: `resolveJwtSecret`.
   - Behavior: throws if resolved secret is shorter than 32 chars.

### C. Token lifetime defaults and bounds
3. `DEFAULT_ACCESS_TOKEN_TTL = '15m'`
4. `DEFAULT_REFRESH_TOKEN_TTL = '7d'`
   - Purpose: sane defaults when env values are missing/invalid.
   - Used by: `resolveTokenTtl`.

5. `DEFAULT_REFRESH_TOKEN_TTL_MS = 7 * 86_400_000`
   - Purpose: ms representation of default refresh window (7 days).
   - Used in session expiration math paths that require milliseconds.

6. `MIN_ACCESS_TOKEN_TTL_MS = 60_000`
7. `MAX_ACCESS_TOKEN_TTL_MS = 24 * 3_600_000`
   - Purpose: restrict access token TTL to 1 minute .. 24 hours.
   - Used by: `resolveTokenTtl` calls for access tokens.

8. `MIN_REFRESH_TOKEN_TTL_MS = 3_600_000`
9. `MAX_REFRESH_TOKEN_TTL_MS = 30 * 86_400_000`
   - Purpose: restrict refresh token TTL to 1 hour .. 30 days.
   - Used by: `resolveTokenTtl` calls for refresh tokens.

### D. Password hashing safety floor
10. `DEFAULT_BCRYPT_SALT_ROUNDS = 12`
   - Purpose: secure default bcrypt cost when config is invalid/missing.
   - Used by: `resolveBcryptSaltRounds`.

11. `MIN_BCRYPT_SALT_ROUNDS = 10`
   - Purpose: minimum allowed bcrypt work factor from config.
   - Behavior: if provided rounds are `< 10` or invalid, fallback to `12`.

---

## 5) Behavioral summary to deliver
Final explanation should make this clear:
- These constants are **guardrails**, not arbitrary numbers.
- The file prevents weak secrets, malformed duration inputs, unsafe token windows, and weak password hashing cost.
- Invalid config does **not** crash token TTL selection; it falls back to secure defaults.
- Invalid/weak JWT secrets do fail fast (throw), by design.

---

## 6) Final response format
Return in markdown with 4 sections:
1. **Duration parsing**
2. **JWT secret strength**
3. **Token TTL defaults + min/max limits**
4. **Bcrypt cost defaults + minimum**

Each constant gets:
- short definition
- where used
- practical effect

---

## 7) Completion criteria
The response is complete when:
- all requested constants are covered
- each constant is tied to the function that uses it
- fallback/validation behavior is explicitly explained
- explanation is concise but complete enough to understand production impact
