import { Readable } from 'stream';

export interface StorageProvider {
  upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult>;
  download(bucket: string, key: string): Promise<Buffer>;
  downloadStream(bucket: string, key: string): Promise<Readable>;
  delete(bucket: string, key: string): Promise<void>;
  getSignedUrl(options: SignedUrlOptions): Promise<string>;
  exists(bucket: string, key: string): Promise<boolean>;
  checkConnection(): Promise<void>;
  /** Returns size in bytes, or 0 if object not found / unknown. */
  getFileSize?(bucket: string, key: string): Promise<number>;
  copyObject?(bucket: string, sourceKey: string, destinationKey: string): Promise<{ key: string }>;
  createMultipartUpload?(
    bucket: string,
    key: string,
    contentType: string,
  ): Promise<{ uploadId: string }>;
  getSignedPartUploadUrl?(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn?: number,
  ): Promise<string>;
  completeMultipartUpload?(
    bucket: string,
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void>;
  abortMultipartUpload?(bucket: string, key: string, uploadId: string): Promise<void>;
}

export interface UploadResult {
  key: string;
  url: string;
  etag: string;
  size?: number;
}

export interface SignedUrlOptions {
  bucket: string;
  key: string;
  expiresIn?: number;
  operation?: 'get' | 'put';
  contentType?: string;
  /** Force browser download instead of inline render (NL-BUG-MEDIA-001). */
  contentDisposition?: string;
}

export interface StorageModuleOptions {
  provider: 's3' | 'local';
  s3?: S3StorageConfig;
  local?: LocalStorageConfig;
}

export interface S3StorageConfig {
  region?: string;
  /** Internal SDK endpoint (server-side upload/download). */
  endpoint?: string;
  /** Browser-reachable host for presigned URLs and public object URLs. Falls back to `endpoint`. */
  publicEndpoint?: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle?: boolean;
}

export interface LocalStorageConfig {
  basePath: string;
  baseUrl?: string;
}
