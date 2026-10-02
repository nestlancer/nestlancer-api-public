/** Mirrors worker `MediaContext` / `MediaJobType` for queue payloads. */
export enum MediaJobContext {
  PROJECT = 'PROJECT',
  AVATAR = 'AVATAR',
  PORTFOLIO = 'PORTFOLIO',
  BLOG = 'BLOG',
  REQUEST = 'REQUEST',
  MESSAGE = 'MESSAGE',
}

export enum MediaJobType {
  VIRUS_SCAN = 'VIRUS_SCAN',
  IMAGE_PROCESS = 'IMAGE_PROCESS',
  VIDEO_PROCESS = 'VIDEO_PROCESS',
  DOCUMENT_PROCESS = 'DOCUMENT_PROCESS',
  THUMBNAIL_REGENERATE = 'THUMBNAIL_REGENERATE',
}

export const MEDIA_PROCESSING_QUEUE = 'media_processing_queue';
