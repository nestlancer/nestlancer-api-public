import { MediaStatus } from '@nestlancer/common';

import { MediaStorageService } from '../storage/storage.service';

function isHttpUrl(value: string): boolean {
  return value.startsWith('http://') || value.startsWith('https://');
}

function isDownloadableStatus(status: unknown): boolean {
  return status === MediaStatus.READY;
}

function pickStorageKey(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  if (isHttpUrl(value)) return null;
  return value;
}

export async function enrichMediaUrls<T extends Record<string, unknown>>(
  media: T,
  storageService: MediaStorageService,
): Promise<T> {
  if (!isDownloadableStatus(media.status)) {
    return { ...media, urls: {} };
  }

  const metadata = (media.metadata ?? {}) as Record<string, unknown>;
  const variants = (metadata.variants ?? {}) as Record<string, string>;
  const urlsRaw = (media.urls ?? {}) as Record<string, unknown>;

  const originalKey = typeof metadata.storageKey === 'string' ? metadata.storageKey : null;
  const thumbnailKey = pickStorageKey(urlsRaw.thumbnailKey) ?? pickStorageKey(urlsRaw.thumbnail);
  const previewKey =
    pickStorageKey(urlsRaw.previewKey) ??
    pickStorageKey(urlsRaw.preview) ??
    (typeof variants.medium_800 === 'string' ? variants.medium_800 : null);

  const urls: Record<string, string> = {};

  if (originalKey) {
    urls.original = await storageService.generatePresignedDownloadUrl(originalKey);
  } else if (typeof urlsRaw.original === 'string' && isHttpUrl(urlsRaw.original)) {
    urls.original = urlsRaw.original;
  }

  if (thumbnailKey) {
    urls.thumbnail = await storageService.generatePresignedDownloadUrl(thumbnailKey);
  } else if (typeof urlsRaw.thumbnail === 'string' && isHttpUrl(urlsRaw.thumbnail)) {
    urls.thumbnail = urlsRaw.thumbnail;
  }

  if (previewKey) {
    urls.preview = await storageService.generatePresignedDownloadUrl(previewKey);
  } else if (typeof urlsRaw.preview === 'string' && isHttpUrl(urlsRaw.preview)) {
    urls.preview = urlsRaw.preview;
  }

  if (Object.keys(urls).length === 0) {
    return media;
  }

  return { ...media, urls };
}

export async function enrichMediaList<T extends Record<string, unknown>>(
  items: T[],
  storageService: MediaStorageService,
): Promise<T[]> {
  return Promise.all(items.map((item) => enrichMediaUrls(item, storageService)));
}
