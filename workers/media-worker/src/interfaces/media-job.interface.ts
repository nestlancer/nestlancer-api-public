export enum MediaContext {
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

export interface MediaJob {
  type: MediaJobType;
  mediaId: string;
  s3Key: string;
  contentType: string;
  context: MediaContext;
  userId: string;
}
