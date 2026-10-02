/** Application-wide constants */
export const APP_NAME = 'Nestlancer';
export const APP_VERSION = '1.0.0';
export const API_PREFIX = 'api';
export const API_VERSION = 'v1';
export const API_BASE_PATH = `/${API_PREFIX}/${API_VERSION}`;

/** Default ports */
export const DEFAULT_GATEWAY_PORT = 3000;
export const DEFAULT_WS_PORT = 3100;

/** Timeout defaults */
export const DEFAULT_REQUEST_TIMEOUT_MS = 30000;
export const UPLOAD_REQUEST_TIMEOUT_MS = 120000;
export const WEBHOOK_REQUEST_TIMEOUT_MS = 10000;

/** Maximum payload sizes */
export const MAX_PAYLOAD_SIZE = '10mb';
export const MAX_UPLOAD_SIZE = '50mb';

/** Health check */
export const HEALTH_CHECK_TIMEOUT_MS = 5000;
export const HEALTH_CACHE_TTL_SECONDS = 10;

/** Default timezone */
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';
export const DEFAULT_LOCALE = 'en-IN';

/** Cache TTLs (seconds) */
export const CACHE_TTL_SHORT = 60; // 1 minute
export const CACHE_TTL_MEDIUM = 300; // 5 minutes
export const CACHE_TTL_LONG = 3600; // 1 hour
export const CACHE_TTL_VERY_LONG = 86400; // 24 hours

/** Queue names */
export const QUEUE_EMAIL = 'email.queue';
export const QUEUE_NOTIFICATION = 'notification.queue';
export const QUEUE_AUDIT = 'audit.queue';
export const QUEUE_MEDIA = 'media.queue';
export const QUEUE_ANALYTICS = 'analytics.queue';
export const QUEUE_WEBHOOK = 'webhook.queue';
export const QUEUE_CDN = 'cdn.queue';
export const QUEUE_DOCUMENT = 'document.queue';
export const QUEUE_EXPORT = 'export.queue';

/** Exchange names */
export const EXCHANGE_EVENTS = 'nestlancer.events';
export const EXCHANGE_DLX = 'nestlancer.dlx';
