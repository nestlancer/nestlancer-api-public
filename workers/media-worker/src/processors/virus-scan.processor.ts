import * as fs from 'fs';
import * as path from 'path';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import clamav from 'clamav.js';

import { LoggerService } from '@nestlancer/logger';
import { StorageService } from '@nestlancer/storage';

import { ScanResult } from '../interfaces/processing-options.interface';
import { resolvePrivateBucket } from '../utils/resolve-private-bucket';

/**
 * Processor responsible for scanning media files for viruses using ClamAV.
 * Downloads the folder to a temporary local path before scanning.
 */
@Injectable()
export class VirusScanProcessor {
  private readonly tempDir: string;

  constructor(
    private readonly logger: LoggerService,
    private readonly configService: ConfigService,
    private readonly storage: StorageService,
  ) {
    this.tempDir = this.configService.get<string>('media-worker.tempDir', '/tmp/media-worker');
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Downloads a file from S3 and scans it using ClamAV.
   * Ensures the local temporary file is cleaned up after scanning.
   *
   * @param s3Key - The key of the file in the private S3 bucket
   * @returns A promise resolving to a ScanResult indicating infection status
   */
  async scanFile(s3Key: string): Promise<ScanResult> {
    if (this.configService.get<boolean>('media-worker.skipVirusScan', false)) {
      this.logger.warn(
        `[VirusScan] MEDIA_SKIP_VIRUS_SCAN enabled — quarantining ${s3Key} (fail-closed)`,
      );
      return {
        isInfected: false,
        scanUnavailable: true,
        details: 'Virus scan skipped by configuration (fail-closed quarantine)',
      };
    }

    const fileName = path.basename(s3Key);
    const localPath = path.join(this.tempDir, `${Date.now()}-${fileName}`);
    const bucket = resolvePrivateBucket(this.configService);

    const cleanupLocalFile = (): void => {
      // clamav.js may still hold a ReadStream briefly after its callback fires.
      setTimeout(() => {
        try {
          if (fs.existsSync(localPath)) {
            fs.unlinkSync(localPath);
          }
        } catch {
          // ignore missing file
        }
      }, 500).unref();
    };

    try {
      this.logger.debug(`[VirusScan] Streaming ${s3Key} for verification...`);
      const stream = await this.storage.downloadStream(bucket, s3Key);

      // Pipe to local file efficiently
      await new Promise<void>((resolve, reject) => {
        const writeStream = fs.createWriteStream(localPath);
        stream.on('error', reject);
        writeStream.on('finish', () => resolve());
        writeStream.on('error', reject);
        stream.pipe(writeStream);
      });

      const clamavHost = this.configService.get<string>('media-worker.clamavHost', 'localhost');
      const clamavPort = this.configService.get<number>('media-worker.clamavPort', 3310);
      // clamav.js runtime API is createScanner(port, host); published types are reversed.
      const scanner = (
        clamav.createScanner as unknown as (
          port: number,
          host: string,
        ) => ReturnType<typeof clamav.createScanner>
      )(clamavPort, clamavHost);

      return await new Promise<ScanResult>((resolve) => {
        scanner.scan(
          localPath,
          (err: Error | null, object: unknown, result: unknown) => {
            cleanupLocalFile();
            if (err) {
              this.logger.error(`[VirusScan] ClamAV service error: ${err.message}`);
              return resolve({
                isInfected: false,
                scanUnavailable: true,
                details: `Security scan unavailable: ${err.message}`,
              });
            }

            // clamav.js returns the virus name as a string when infected (e.g. "Eicar-Signature").
            const virusFromString =
              typeof result === 'string' && result.trim() ? result.trim() : undefined;
            const virusFromObject = (() => {
              if (!result || typeof result !== 'object') return undefined;
              const record = result as { status?: string; virus?: string };
              return record.status === 'FOUND' && typeof record.virus === 'string'
                ? record.virus
                : undefined;
            })();
            const virusName = virusFromString ?? virusFromObject;

            if (virusName) {
              this.logger.warn(`[VirusScan] CRITICAL: Virus detected in ${s3Key} (${virusName})`);
              resolve({ isInfected: true, virusName });
            } else {
              this.logger.debug(`[VirusScan] File ${s3Key} passed security check.`);
              resolve({ isInfected: false });
            }
          },
        );
      });
    } catch (error: any) {
      cleanupLocalFile();
      this.logger.error(`[VirusScan] Failed during scan lifecycle: ${error.message}`, error.stack);
      return {
        isInfected: false,
        scanUnavailable: true,
        details: `Internal Error: ${error.message}`,
      };
    }
  }
}
