/**
 * Env helpers for rate-limit / lockout switches.
 *
 * Infisical dotenv export often emits RATE_LIMIT_ENABLED='false' (with quotes).
 * Docker Compose `env_file` does NOT strip those quotes, so naive checks like
 * `process.env.RATE_LIMIT_ENABLED === 'false'` fail and limits stay ON.
 *
 * Always use these helpers — never compare raw env strings for rate-limit flags.
 */

/** Strip surrounding whitespace and a single matching quote pair. */
export function parseEnvString(raw: string | undefined | null): string {
  return String(raw ?? '')
    .trim()
    .replace(/^['"]|['"]$/g, '');
}

/**
 * Master switch for API rate limits / auth IP-fail / account-lockout 429s.
 *
 * - `false` / `0` → disabled (ops/seed)
 * - `true` / `1` → enabled
 * - unset / unknown → enabled (fail-closed for production safety)
 */
export function isRateLimitEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const v = parseEnvString(env.RATE_LIMIT_ENABLED).toLowerCase();
  if (v === 'false' || v === '0' || v === 'off' || v === 'no') return false;
  if (v === 'true' || v === '1' || v === 'on' || v === 'yes') return true;
  return true;
}

/** Parse a positive integer from env (handles Infisical quotes). */
export function parseEnvPositiveInt(
  raw: string | undefined | null,
  fallback: number,
): number {
  const n = Number(parseEnvString(raw));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.floor(n);
}

/** Parse a non-negative integer (0 allowed) from env. */
export function parseEnvNonNegativeInt(
  raw: string | undefined | null,
  fallback: number,
): number {
  const n = Number(parseEnvString(raw));
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.floor(n);
}
