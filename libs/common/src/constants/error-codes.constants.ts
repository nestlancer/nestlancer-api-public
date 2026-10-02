/**
 * Application error codes matching 117-error-codes-endpoints.md.
 * Format: DOMAIN_NNN or DOMAIN_DESCRIPTIVE_NAME
 */
export const ERROR_CODES = {
  // Authentication errors
  AUTH_001: 'AUTH_001', // Invalid credentials
  AUTH_002: 'AUTH_002', // Token expired
  AUTH_003: 'AUTH_003', // Token invalid
  AUTH_004: 'AUTH_004', // Account suspended
  AUTH_005: 'AUTH_005', // Account not verified
  AUTH_006: 'AUTH_006', // Account locked (too many failed attempts)
  AUTH_007: 'AUTH_007', // 2FA required
  AUTH_008: 'AUTH_008', // 2FA code invalid
  AUTH_009: 'AUTH_009', // Refresh token invalid / revoked
  AUTH_010: 'AUTH_010', // CSRF token invalid
  AUTH_TURNSTILE_FAILED: 'AUTH_TURNSTILE_FAILED',
  AUTH_INSUFFICIENT_ROLE: 'AUTH_INSUFFICIENT_ROLE',
  AUTH_WS_UNAUTHORIZED: 'AUTH_WS_UNAUTHORIZED',

  // Validation errors
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',

  // Resource errors
  NOT_FOUND: 'NOT_FOUND',
  ALREADY_EXISTS: 'ALREADY_EXISTS',
  CONFLICT: 'CONFLICT',

  // Business logic errors
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',

  // Payment errors
  PAYMENT_001: 'PAYMENT_001', // Payment creation failed
  PAYMENT_002: 'PAYMENT_002', // Payment verification failed
  PAYMENT_003: 'PAYMENT_003', // Refund failed
  PAYMENT_004: 'PAYMENT_004', // Invalid amount

  // System errors
  SYS_MAINTENANCE: 'SYS_MAINTENANCE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  GATEWAY_TIMEOUT: 'GATEWAY_TIMEOUT',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  EXTERNAL_SERVICE_ERROR: 'EXTERNAL_SERVICE_ERROR',

  // Forbidden
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
