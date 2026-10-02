import { BadRequestException } from '@nestjs/common';

import { DirectUploadDto } from '../dto/direct-upload.dto';
import { FileType, MAX_FILE_SIZES, SUPPORTED_MIME_TYPES } from '../interfaces/media.interface';

function maxBytesForFileType(fileType: FileType): number {
  switch (fileType) {
    case FileType.IMAGE:
      return MAX_FILE_SIZES.image;
    case FileType.VIDEO:
      return MAX_FILE_SIZES.video;
    case FileType.ARCHIVE:
      return MAX_FILE_SIZES.archive;
    case FileType.DOCUMENT:
    default:
      return MAX_FILE_SIZES.document;
  }
}

function allowedMimesForFileType(fileType: FileType): string[] {
  switch (fileType) {
    case FileType.IMAGE:
      return SUPPORTED_MIME_TYPES.images;
    case FileType.VIDEO:
      return SUPPORTED_MIME_TYPES.videos;
    case FileType.ARCHIVE:
      return SUPPORTED_MIME_TYPES.archives;
    case FileType.DOCUMENT:
      return SUPPORTED_MIME_TYPES.documents;
    default:
      return [];
  }
}

export function normalizeDirectUploadDto(
  dto: DirectUploadDto,
  mimeType?: string,
): DirectUploadDto & { fileType: FileType } {
  let fileType = dto.fileType;

  if (!fileType && dto.context) {
    const ctx = dto.context.trim().toUpperCase();
    if (
      ctx.includes('USER_FILE') ||
      ctx.includes('DOCUMENT') ||
      ctx.includes('ATTACHMENT') ||
      ctx.includes('REQUEST')
    ) {
      fileType = FileType.DOCUMENT;
    } else if (ctx.includes('IMAGE') || ctx.includes('AVATAR')) {
      fileType = FileType.IMAGE;
    } else if (ctx.includes('VIDEO')) {
      fileType = FileType.VIDEO;
    } else if (ctx.includes('ARCHIVE') || ctx.includes('ZIP')) {
      fileType = FileType.ARCHIVE;
    }
  }

  if (!fileType && mimeType) {
    fileType = inferFileTypeFromMime(mimeType);
  }

  return {
    ...dto,
    fileType: fileType ?? FileType.DOCUMENT,
  };
}

export function inferFileTypeFromMime(mimeType: string): FileType {
  const normalized = mimeType.trim().toLowerCase();
  if (SUPPORTED_MIME_TYPES.images.includes(normalized)) return FileType.IMAGE;
  if (SUPPORTED_MIME_TYPES.videos.includes(normalized)) return FileType.VIDEO;
  if (SUPPORTED_MIME_TYPES.archives.includes(normalized)) return FileType.ARCHIVE;
  return FileType.DOCUMENT;
}

/** Map generic octet-stream uploads to a concrete allowed MIME using filename hints. */
export function normalizeUploadMime(
  mimeType: string,
  filename: string,
  fileType: FileType,
): string {
  const normalized = (mimeType || 'application/octet-stream').trim().toLowerCase();
  if (normalized !== 'application/octet-stream' || fileType !== FileType.DOCUMENT) {
    return normalized;
  }

  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'pdf':
      return 'application/pdf';
    case 'csv':
      return 'text/csv';
    case 'md':
    case 'markdown':
      return 'text/markdown';
    case 'doc':
      return 'application/msword';
    case 'docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    case 'txt':
    case 'com':
    default:
      return 'text/plain';
  }
}

export function validateUploadRequest(
  fileType: FileType,
  mimeType: string,
  size: number,
  filename?: string,
): void {
  if (!Number.isFinite(size) || size < 1) {
    throw new BadRequestException('File size must be at least 1 byte');
  }

  const maxBytes = maxBytesForFileType(fileType);
  if (size > maxBytes) {
    throw new BadRequestException(`File exceeds maximum size for ${fileType} (${maxBytes} bytes)`);
  }

  const normalized = mimeType.trim().toLowerCase();
  // NL-BUG-MEDIA-001: SVG can carry script; never accept as image even if spoofed via extension.
  if (
    normalized === 'image/svg+xml' ||
    normalized.includes('svg') ||
    /\.svgz?$/i.test(filename ?? '')
  ) {
    throw new BadRequestException(
      'SVG uploads are not allowed. Export as PNG or JPEG instead.',
    );
  }

  const allowed = allowedMimesForFileType(fileType);
  if (allowed.length > 0 && !allowed.includes(normalized)) {
    throw new BadRequestException(`MIME type ${mimeType} is not allowed for ${fileType}`);
  }
}
