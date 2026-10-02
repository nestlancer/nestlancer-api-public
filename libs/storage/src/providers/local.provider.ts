import { Injectable, Logger, Inject } from '@nestjs/common';
import { promises as fs } from 'fs';
import { createReadStream } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';
import {
  StorageProvider,
  UploadResult,
  SignedUrlOptions,
  LocalStorageConfig,
} from '../interfaces/storage.interface';

import { Readable } from 'stream';

@Injectable()
export class LocalProvider implements StorageProvider {
  private readonly logger = new Logger(LocalProvider.name);

  constructor(
    @Inject('LOCAL_STORAGE_CONFIG')
    private readonly config: LocalStorageConfig,
  ) {
    this.logger.log(`LocalProvider initialized (basePath: ${config.basePath})`);
  }

  async upload(
    bucket: string,
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, any>,
  ): Promise<UploadResult> {
    const filePath = this.resolvePath(bucket, key);
    await fs.mkdir(dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, body);

    const etag = createHash('md5').update(body).digest('hex');

    // Write metadata alongside the file
    const metaPath = filePath + '.meta.json';
    await fs.writeFile(
      metaPath,
      JSON.stringify({
        contentType,
        size: body.length,
        etag,
        uploadedAt: new Date().toISOString(),
        ...metadata,
      }),
    );

    this.logger.debug(
      `Uploaded ${key} to ${bucket} (${body.length} bytes)${metadata?.needsSync ? ' [NEEDS SYNC]' : ''}`,
    );

    return {
      key,
      url: this.buildUrl(bucket, key),
      etag,
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

  async downloadStream(bucket: string, key: string): Promise<Readable> {
    const filePath = this.resolvePath(bucket, key);
    this.logger.debug(`Streaming download of ${key} from ${bucket}`);
    return createReadStream(filePath);
  }

  async delete(bucket: string, key: string): Promise<void> {
    const filePath = this.resolvePath(bucket, key);
    const metaPath = filePath + '.meta.json';

    await fs.unlink(filePath).catch(() => {});
    await fs.unlink(metaPath).catch(() => {});

    this.logger.debug(`Deleted ${key} from ${bucket}`);
  }

  async getSignedUrl(options: SignedUrlOptions): Promise<string> {
    // Local provider doesn't support true signed URLs.
    // Return a direct file URL (suitable for dev only).
    const url = this.buildUrl(options.bucket, options.key);
    this.logger.debug(`Generated local URL for ${options.bucket}/${options.key}`);
    return url;
  }

  async exists(bucket: string, key: string): Promise<boolean> {
    const filePath = this.resolvePath(bucket, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async checkConnection(): Promise<void> {
    // Local storage is always "connected" if the basePath is accessible
    await fs.access(this.config.basePath).catch(async () => {
      await fs.mkdir(this.config.basePath, { recursive: true });
    });
  }

  async listPendingSync(): Promise<Array<{ bucket: string; key: string; contentType: string }>> {
    const pending: Array<{ bucket: string; key: string; contentType: string }> = [];
    const rootPath = this.config.basePath;

    try {
      await fs.access(rootPath);
    } catch {
      return [];
    }

    const traverse = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
          await traverse(fullPath);
        } else if (entry.isFile() && entry.name.endsWith('.meta.json')) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const meta = JSON.parse(content);
            if (meta.needsSync === true) {
              // Extract bucket and key from path
              // fullPath is rootPath/bucket/key.meta.json
              const relativePath = fullPath.slice(rootPath.length + 1); // remove rootPath and leading slash
              const parts = relativePath.split('/');
              const bucket = parts[0];
              const key = parts.slice(1).join('/').replace('.meta.json', '');

              pending.push({
                bucket,
                key,
                contentType: meta.contentType || 'application/octet-stream',
              });
            }
          } catch (e: any) {
            this.logger.error(`Failed to read metadata file ${fullPath}: ${e.message}`);
          }
        }
      }
    };

    await traverse(rootPath);
    return pending;
  }

  async getFileSize(bucket: string, key: string): Promise<number> {
    const filePath = this.resolvePath(bucket, key);
    try {
      const stat = await fs.stat(filePath);
      return stat.size;
    } catch {
      return 0;
    }
  }

  private resolvePath(bucket: string, key: string): string {
    return join(this.config.basePath, bucket, key);
  }

  private buildUrl(bucket: string, key: string): string {
    const base = this.config.baseUrl || `file://${this.config.basePath}`;
    return `${base}/${bucket}/${key}`;
  }
}
