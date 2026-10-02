export interface IdempotencyRecord {
  key: string;
  path: string;
  method: string;
  requestHash?: string;
  responseCode?: number;
  responseBody?: unknown;
  expiresAt: Date;
}
