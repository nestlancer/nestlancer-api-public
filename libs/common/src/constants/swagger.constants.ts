/**
 * OpenAPI / Swagger paths and environment toggles.
 * Single source of truth — used by gateway bootstrap, JwtAuthGuard, and tests.
 */

/** Swagger UI and OpenAPI JSON path segments that must never require JWT. */
export const PUBLIC_DOCUMENTATION_PATH_SEGMENTS = [
  '/docs',
  '/docs-specs',
  '/docs-gateway-json',
  '/docs-all-json',
  '/docs-json',
] as const;

/** Gateway Swagger UI entry (outside global API prefix). */
export const SWAGGER_UI_PATH = '/docs';

/** Gateway-only OpenAPI JSON for the Swagger dropdown. */
export const SWAGGER_GATEWAY_SPEC_PATH = '/docs-gateway-json';

/** Combined OpenAPI JSON for all microservices (outside global API prefix). */
export const SWAGGER_MERGED_SPEC_PATH = '/docs-all-json';

/** Proxied per-microservice specs (under global prefix). */
export const SWAGGER_SPECS_CONTROLLER_PATH = 'docs-specs';

export function isPublicDocumentationPath(path: string): boolean {
  const normalized = path.split('?')[0] ?? path;
  return PUBLIC_DOCUMENTATION_PATH_SEGMENTS.some((segment) => normalized.includes(segment));
}

/**
 * Whether Swagger UI and docs-specs proxy are registered.
 *
 * - SWAGGER_ENABLED=true|false  — explicit override
 * - Unset: enabled when NODE_ENV is not "production" (dev, staging, test)
 * - Production default: disabled (set SWAGGER_ENABLED=true on staging if needed)
 */
export function isSwaggerEnabled(): boolean {
  const explicit = process.env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') return true;
  if (explicit === 'false' || explicit === '0') return false;
  return process.env.NODE_ENV !== 'production';
}
