import { StorageService } from '@nestlancer/storage';

type MediaLike = {
  metadata?: unknown;
  urls?: unknown;
  visibility?: string | null;
};

export function portfolioPublicBucket(): string {
  return process.env.STORAGE_BUCKET_PUBLIC || 'nestlancer-public';
}

export function portfolioLegacyPrivateBucket(): string {
  return process.env.STORAGE_BUCKET_PRIVATE || 'nestlancer-private';
}

export function buildPortfolioPublicObjectUrl(
  bucket: string,
  storageKey: string,
): string | undefined {
  const base =
    process.env.CDN_PUBLIC_BASE_URL ||
    process.env.S3_PUBLIC_ENDPOINT ||
    process.env.STORAGE_PUBLIC_ENDPOINT ||
    process.env.STORAGE_S3_PUBLIC_ENDPOINT ||
    process.env.S3_ENDPOINT ||
    process.env.STORAGE_S3_ENDPOINT;
  if (!base) return undefined;
  return `${base.replace(/\/$/, '')}/${bucket}/${storageKey}`;
}

export async function resolvePortfolioMediaUrl(
  storage: StorageService,
  media: MediaLike,
): Promise<string | undefined> {
  const urls = (media.urls ?? {}) as Record<string, unknown>;
  if (typeof urls.original === 'string' && urls.original.startsWith('http')) {
    return urls.original;
  }

  const metadata = (media.metadata ?? {}) as Record<string, unknown>;
  const storageKey = typeof metadata.storageKey === 'string' ? metadata.storageKey : null;
  if (!storageKey) return undefined;

  const bucket =
    typeof metadata.storageBucket === 'string'
      ? metadata.storageBucket
      : portfolioLegacyPrivateBucket();

  if (bucket === portfolioPublicBucket()) {
    return buildPortfolioPublicObjectUrl(bucket, storageKey);
  }

  try {
    return await storage.getSignedUrl({
      bucket,
      key: storageKey,
      expiresIn: 3600,
      operation: 'get',
    });
  } catch {
    return undefined;
  }
}
