/** Allowed MIME types for file uploads per 111-media-endpoints.
 * SVG is excluded: stored SVG can execute script when served inline (NL-BUG-MEDIA-001).
 */
export const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/x-markdown',
] as const;

export const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm'] as const;
export const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav'] as const;
export const ALLOWED_ARCHIVE_TYPES = ['application/zip', 'application/x-rar-compressed'] as const;

export const ALL_ALLOWED_MIME_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  ...ALLOWED_DOCUMENT_TYPES,
  ...ALLOWED_VIDEO_TYPES,
  ...ALLOWED_AUDIO_TYPES,
  ...ALLOWED_ARCHIVE_TYPES,
] as const;

/** Subset of media MIME types allowed for project request attachments. */
export const REQUEST_ATTACHMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/x-markdown',
] as const;

export type AllowedMimeType = (typeof ALL_ALLOWED_MIME_TYPES)[number];
export type RequestAttachmentMimeType = (typeof REQUEST_ATTACHMENT_MIME_TYPES)[number];
