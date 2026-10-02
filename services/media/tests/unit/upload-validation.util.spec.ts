import { BadRequestException } from '@nestjs/common';

import { FileType } from '../../src/interfaces/media.interface';
import {
  inferFileTypeFromMime,
  normalizeUploadMime,
  normalizeDirectUploadDto,
  validateUploadRequest,
} from '../../src/media/upload-validation.util';
import { FileType } from '../../src/interfaces/media.interface';

describe('inferFileTypeFromMime', () => {
  it('maps image mime types to IMAGE', () => {
    expect(inferFileTypeFromMime('image/png')).toBe(FileType.IMAGE);
  });

  it('maps video mime types to VIDEO', () => {
    expect(inferFileTypeFromMime('video/mp4')).toBe(FileType.VIDEO);
  });

  it('defaults unknown mime types to DOCUMENT', () => {
    expect(inferFileTypeFromMime('application/pdf')).toBe(FileType.DOCUMENT);
  });
});

describe('validateUploadRequest', () => {
  it('allows image/gif for IMAGE file type', () => {
    expect(() => validateUploadRequest(FileType.IMAGE, 'image/gif', 1024)).not.toThrow();
  });

  it('rejects unknown mime for IMAGE', () => {
    expect(() => validateUploadRequest(FileType.IMAGE, 'application/pdf', 1024)).toThrow(
      BadRequestException,
    );
  });

  it('allows application/zip for ARCHIVE', () => {
    expect(() => validateUploadRequest(FileType.ARCHIVE, 'application/zip', 1024)).not.toThrow();
  });

  it('allows text/markdown for DOCUMENT', () => {
    expect(() => validateUploadRequest(FileType.DOCUMENT, 'text/markdown', 1024)).not.toThrow();
  });

  it('rejects unknown mime for DOCUMENT', () => {
    expect(() =>
      validateUploadRequest(FileType.DOCUMENT, 'application/x-msdownload', 1024),
    ).toThrow(BadRequestException);
  });

  it('allows octet-stream EICAR-style uploads when normalized to text/plain', () => {
    const mime = normalizeUploadMime('application/octet-stream', 'eicar.com', FileType.DOCUMENT);
    expect(mime).toBe('text/plain');
    expect(() => validateUploadRequest(FileType.DOCUMENT, mime, 68)).not.toThrow();
  });
});

describe('normalizeDirectUploadDto', () => {
  it('maps legacy context=USER_FILE to DOCUMENT', () => {
    const dto = normalizeDirectUploadDto({ context: 'USER_FILE' });
    expect(dto.fileType).toBe(FileType.DOCUMENT);
  });

  it('prefers explicit fileType over context', () => {
    const dto = normalizeDirectUploadDto({ context: 'USER_FILE', fileType: FileType.IMAGE });
    expect(dto.fileType).toBe(FileType.IMAGE);
  });
});
