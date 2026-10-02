import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  CopyObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as awsGetSignedUrl } from '@aws-sdk/s3-request-presigner';
import { presignS3Get } from './sigv4-get.util';
import {
  StorageProvider,
  UploadResult,
  SignedUrlOptions,
  S3StorageConfig,
} from '../interfaces/storage.interface';

@Injectable()
export class S3Provider implements StorageProvider {
  private readonly logger = new Logger(S3Provider.name);
  /** Server-side operations (upload, download, head). */
  private readonly client: S3Client;
  /**
   * Presigned URLs are opened by browsers at publicEndpoint. SigV4 includes
   * that host, so they must be signed for it. Rewriting the host after signing
   * against the internal endpoint makes MinIO return SignatureDoesNotMatch.
   */
  private readonly presignClient: S3Client;
  /** Reuse a signature until shortly before it expires. SigV4 is local but was taking hundreds of ms under tracing. */
  private readonly signedUrlCache = new Map<string, { url: string; freshUntil: number }>();

  constructor(@Inject('S3_CONFIG') private readonly config: S3StorageConfig) {
    const clientOptions = {
      region: config.region || 'us-east-1',
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      forcePathStyle: config.forcePathStyle ?? true,
      // Default checksum and S3 Express middleware turn a local presign into a
      // network round trip. Covers only need a signature.
      disableS3ExpressSessionAuth: true,
      requestChecksumCalculation: 'WHEN_REQUIRED' as const,
      responseChecksumValidation: 'WHEN_REQUIRED' as const,
    };

    this.client = new S3Client({
      ...clientOptions,
      endpoint: config.endpoint,
    });

    const presignEndpoint = config.publicEndpoint || config.endpoint;
    this.presignClient =
      presignEndpoint && presignEndpoint !== config.endpoint
        ? new S3Client({
            ...clientOptions,
            endpoint: presignEndpoint,
          })
        : this.client;

    this.logger.log(
      `S3Provider initialized (internal: ${config.endpoint || 'default'}, public: ${config.publicEndpoint || 'same'})`,
    );
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
    _metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      ContentLength: body.length,
    });

    const result = await this.client.send(command);
    this.logger.debug(`Uploaded ${key} to ${bucket} (${body.length} bytes)`);

    return {
      key,
      url: this.buildObjectUrl(bucket, key),
      etag: result.ETag?.replace(/"/g, '') || '',
      size: body.length,
    };
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const stream = await this.downloadStream(bucket, key);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async downloadStream(bucket: string, key: string): Promise<any> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const result = await this.client.send(command);

    if (!result.Body) {
      throw new Error(`Empty body for ${bucket}/${key}`);
    }

    this.logger.debug(`Streaming download of ${key} from ${bucket}`);
    return result.Body;
  }

  async delete(bucket: string, key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: bucket, Key: key });
    await this.client.send(command);
    this.logger.debug(`Deleted ${key} from ${bucket}`);
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    const expiresIn = options.expiresIn || 3600;
    const cacheKey = [
      options.operation || 'get',
      options.bucket,
      options.key,
      expiresIn,
      options.contentType || '',
      options.contentDisposition || '',
    ].join('\n');
    const cached = this.signedUrlCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.freshUntil > now) return cached.url;

    const endpoint = this.config.publicEndpoint || this.config.endpoint;
    if (options.operation !== 'put' && !options.contentDisposition && endpoint) {
      const url = presignS3Get({
        endpoint,
        bucket: options.bucket,
        key: options.key,
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        region: this.config.region || 'us-east-1',
        expiresIn,
      });
      const ttlMs = Math.min(Math.max(expiresIn - 60, 0) * 1000, 10 * 60 * 1000);
      if (ttlMs > 0) {
        this.signedUrlCache.set(cacheKey, { url, freshUntil: now + ttlMs });
      }
      return url;
    }

    const command =
      options.operation === 'put'
        ? new PutObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
            ContentType: options.contentType,
          })
        : new GetObjectCommand({
            Bucket: options.bucket,
            Key: options.key,
            ...(options.contentDisposition
              ? { ResponseContentDisposition: options.contentDisposition }
              : {}),
          });

    const url = await awsGetSignedUrl(this.presignClient, command, { expiresIn });
    const ttlMs = Math.min(Math.max(expiresIn - 60, 0) * 1000, 10 * 60 * 1000);
    if (ttlMs > 0) {
      this.signedUrlCache.set(cacheKey, { url, freshUntil: now + ttlMs });
    }
    this.logger.debug(
      `Generated signed URL for ${options.bucket}/${options.key} (expires: ${expiresIn}s)`,
    );
    return url;
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return true;
    } catch {
      return false;
    }
  }

  async checkConnection(): Promise<void> {
    await this.client.send(new HeadBucketCommand({ Bucket: 'healthcheck' })).catch((err) => {
      if (
        err.name === 'NoSuchBucket' ||
        err.name === 'AccessDenied' ||
        err.$metadata?.httpStatusCode === 403 ||
        err.$metadata?.httpStatusCode === 404
      ) {
        return;
      }
      throw err;
    });
  }

  async getFileSize(bucket: string, key: string): Promise<number> {
    try {
      const result = await this.client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      return result.ContentLength ?? 0;
    } catch {
      return 0;
    }
  }

  async copyObject(
    bucket: string,
    sourceKey: string,
    destinationKey: string,
  ): Promise<{ key: string }> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourceKey}`,
        Key: destinationKey,
      }),
    );
    this.logger.debug(`Copied ${sourceKey} → ${destinationKey} in ${bucket}`);
    return { key: destinationKey };
  }

  async createMultipartUpload(
    bucket: string,
    key: string,
    contentType: string,
  ): Promise<{ uploadId: string }> {
    const result = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType,
      }),
    );
    if (!result.UploadId) {
      throw new Error('S3 did not return a multipart upload id');
    }
    return { uploadId: result.UploadId };
  }

  async getSignedPartUploadUrl(
    bucket: string,
    key: string,
    uploadId: string,
    partNumber: number,
    expiresIn = 3600,
  ): Promise<string> {
    const command = new UploadPartCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });
    return awsGetSignedUrl(this.presignClient, command, { expiresIn });
  }

  async completeMultipartUpload(
    bucket: string,
    key: string,
    uploadId: string,
    parts: { partNumber: number; etag: string }[],
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: parts
            .slice()
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((p) => ({
              ETag: p.etag,
              PartNumber: p.partNumber,
            })),
        },
      }),
    );
  }

  async abortMultipartUpload(bucket: string, key: string, uploadId: string): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: bucket,
        Key: key,
        UploadId: uploadId,
      }),
    );
  }

  private buildObjectUrl(bucket: string, key: string): string {
    const base = this.config.publicEndpoint ?? this.config.endpoint;
    if (base) {
      return `${base.replace(/\/$/, '')}/${bucket}/${key}`;
    }
    return `https://${bucket}.s3.${this.config.region || 'us-east-1'}.amazonaws.com/${key}`;
  }
}
