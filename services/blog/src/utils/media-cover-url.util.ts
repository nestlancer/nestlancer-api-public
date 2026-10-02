import { StorageService } from '@nestlancer/storage';

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function pickStorageKey(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (isHttpUrl(value)) return null;
  return value;
}

export async function resolveMediaCoverUrl(
  media: Record<string, unknown> | null | undefined,
  storage: StorageService,
  bucket: string,
  expiresIn: number,
): Promise<string | null> {
  if (!media) return null;

  const metadata = (media.metadata ?? {}) as Record<string, unknown>;
  const variants = (metadata.variants ?? {}) as Record<string, string>;
  const urlsRaw = (media.urls ?? {}) as Record<string, unknown>;

  const previewKey =
    pickStorageKey(urlsRaw.previewKey) ??
    pickStorageKey(urlsRaw.preview) ??
    (typeof variants.medium_800 === 'string' ? variants.medium_800 : null);
  const thumbnailKey = pickStorageKey(urlsRaw.thumbnailKey) ?? pickStorageKey(urlsRaw.thumbnail);
  const originalKey = typeof metadata.storageKey === 'string' ? metadata.storageKey : null;

  const sign = (key: string) => storage.getSignedUrl({ bucket, key, expiresIn, operation: 'get' });

  for (const key of [previewKey, thumbnailKey, originalKey]) {
    if (key) {
      return sign(key);
    }
  }

  for (const field of ['preview', 'thumbnail', 'original'] as const) {
    const raw = urlsRaw[field];
    if (typeof raw === 'string' && isHttpUrl(raw)) return raw;
  }

  return null;
}
