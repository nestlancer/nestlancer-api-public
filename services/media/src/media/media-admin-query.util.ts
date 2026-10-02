import { FileType, SUPPORTED_MIME_TYPES } from '../interfaces/media.interface';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function mimeTypesForFileType(fileType: FileType): string[] {
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

export function parseSortParam(sort?: string): { field: string; direction: 'asc' | 'desc' } {
  if (!sort?.trim()) {
    return { field: 'createdAt', direction: 'desc' };
  }
  const [field, direction] = sort.split(':');
  const normalizedField = field?.trim() || 'createdAt';
  const allowed = new Set(['createdAt', 'updatedAt', 'size', 'filename', 'status']);
  return {
    field: allowed.has(normalizedField) ? normalizedField : 'createdAt',
    direction: direction?.trim().toLowerCase() === 'asc' ? 'asc' : 'desc',
  };
}

export function buildMediaWhereClause(filters: {
  fileType?: FileType;
  status?: string;
  search?: string;
  uploaderId?: string;
  visibility?: string;
  contextType?: string;
  contextId?: string;
}): Record<string, unknown> {
  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.uploaderId) {
    where.uploaderId = filters.uploaderId;
  }

  if (filters.visibility) {
    where.visibility = filters.visibility;
  }

  if (filters.contextType) {
    if (filters.contextType === 'ungrouped') {
      where.contextId = null;
      where.contextType = null;
    } else if (filters.contextType === 'message') {
      // Message attachments may be tagged as message or thread.
      where.contextType = { in: ['message', 'thread'] };
    } else {
      where.contextType = filters.contextType;
    }
  }

  if (filters.contextId && filters.contextType !== 'ungrouped') {
    where.contextId = filters.contextId;
  }

  if (filters.fileType) {
    const mimes = mimeTypesForFileType(filters.fileType);
    if (mimes.length > 0) {
      where.mimeType = { in: mimes };
    }
  }

  const search = filters.search?.trim();
  if (search) {
    const or: Record<string, unknown>[] = [
      { filename: { contains: search, mode: 'insensitive' } },
      { originalFilename: { contains: search, mode: 'insensitive' } },
      { mimeType: { contains: search, mode: 'insensitive' } },
    ];
    if (UUID_RE.test(search)) {
      or.push({ id: search }, { uploaderId: search });
    }
    where.OR = or;
  }

  return where;
}

export function formatUploaderSummary(
  uploader: { id: string; email: string; firstName: string; lastName: string } | null | undefined,
) {
  if (!uploader) return null;
  return {
    id: uploader.id,
    email: uploader.email,
    displayName: `${uploader.firstName} ${uploader.lastName}`.trim() || uploader.email,
  };
}
