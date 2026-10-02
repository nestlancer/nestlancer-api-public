/** Common regex patterns for validation */
export const REGEX = {
  /** Email per RFC 5322 (simplified) */
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  /** Password: min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special char */
  PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).{8,128}$/,

  /** UUID (any version, including v4 and v7) */
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,

  /** CUID */
  CUID: /^c[a-z0-9]{24}$/,

  /** Slug: lowercase, hyphens, no leading/trailing hyphens */
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  /** Phone: E.164 format */
  PHONE_E164: /^\+[1-9]\d{1,14}$/,

  /** IANA timezone */
  TIMEZONE: /^[A-Za-z_]+\/[A-Za-z_]+$/,

  /** ISO 639-1 language code */
  LANGUAGE_CODE: /^[a-z]{2}(-[A-Z]{2})?$/,

  /** Hex color */
  HEX_COLOR: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  /** JWT token */
  JWT: /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/,

  /** URL */
  URL: /^https?:\/\/[^\s/$.?#].[^\s]*$/i,

  /** Alphanumeric with hyphens (for idempotency keys, etc.) */
  ALPHANUMERIC_HYPHEN: /^[a-zA-Z0-9-]+$/,

  /** Indian GSTIN (15 chars) — NL-BUG-PDF-013 */
  GSTIN: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i,

  /** Indian PAN (10 chars) — NL-BUG-PDF-013 */
  PAN: /^[A-Z]{5}[0-9]{4}[A-Z]$/i,
} as const;
