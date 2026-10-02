import { z } from 'zod';

export const storageConfigSchema = z.object({
  STORAGE_PROVIDER: z.enum(['s3', 'local']).default('local'),

  // S3-compatible object storage (AWS S3, self-hosted S3 API, etc.)
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  /**
   * Server-side S3 API endpoint (prefer private Tailscale/LAN over public CDN tunnel).
   * When unset, falls back to S3_ENDPOINT.
   */
  S3_LOCAL_ENDPOINT: z.string().optional(),
  S3_ENDPOINT: z.string().optional(),
  /** Public HTTPS host for presigned/object URLs returned to browsers (CDN or reverse proxy). */
  S3_PUBLIC_ENDPOINT: z.string().optional(),
  /** Optional CDN base for public object URLs (portfolio/blog assets). */
  CDN_PUBLIC_BASE_URL: z.string().optional(),
  S3_REGION: z.string().default('us-east-1'),
  S3_PRESIGNED_URL_EXPIRY: z.coerce.number().default(900),

  // Canonical bucket names
  STORAGE_BUCKET_PRIVATE: z.string().default('nestlancer-private'),
  STORAGE_BUCKET_PUBLIC: z.string().default('nestlancer-public'),
  STORAGE_BUCKET_AVATARS: z.string().default('nestlancer-avatars'),
  STORAGE_BUCKET_ATTACHMENTS: z.string().default('nestlancer-requests'),
  STORAGE_BUCKET_QUOTES: z.string().default('nestlancer-quotes-pdfs'),
  STORAGE_BUCKET_DELIVERABLES: z.string().default('nestlancer-deliverables'),
  STORAGE_BUCKET_REPORTS: z.string().default('nestlancer-reports'),
  STORAGE_BUCKET_PDFS: z.string().default('nestlancer-pdfs'),

  // Local storage
  LOCAL_STORAGE_PATH: z.string().default('./data/storage'),
  LOCAL_STORAGE_URL: z.string().optional(),

  // Upload constraints
  STORAGE_MAX_FILE_SIZE: z.coerce.number().default(104857600), // 100 MB
  STORAGE_ALLOWED_MIME_TYPES: z.string().default('image/jpeg,image/png,application/pdf'),
});

export type StorageConfig = z.infer<typeof storageConfigSchema>;
