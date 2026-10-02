import {
  ALLOWED_ARCHIVE_TYPES,
  ALLOWED_DOCUMENT_TYPES,
  ALLOWED_IMAGE_TYPES,
  ALLOWED_VIDEO_TYPES,
} from '@nestlancer/common';

export interface SupportedMimeTypes {
  images: string[];
  documents: string[];
  archives: string[];
  videos: string[];
}

/** Aligned with libs/common mime-types.constants and STORAGE_ALLOWED_MIME_TYPES. */
export const SUPPORTED_MIME_TYPES: SupportedMimeTypes = {
  images: [...ALLOWED_IMAGE_TYPES],
  documents: [...ALLOWED_DOCUMENT_TYPES],
  archives: [...ALLOWED_ARCHIVE_TYPES],
  videos: [...ALLOWED_VIDEO_TYPES],
};

export const MAX_FILE_SIZES = {
  image: 10 * 1024 * 1024, // 10MB
  document: 20 * 1024 * 1024, // 20MB
  archive: 100 * 1024 * 1024, // 100MB
  video: 500 * 1024 * 1024, // 500MB
};

import { MediaStatus } from '@nestlancer/common';

export { MediaStatus };

export enum FileType {
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  ARCHIVE = 'ARCHIVE',
  VIDEO = 'VIDEO',
}
