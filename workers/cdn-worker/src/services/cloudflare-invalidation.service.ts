import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { firstValueFrom } from 'rxjs';

import { CdnProvider, InvalidationResult } from '../interfaces/cdn-provider.interface';

@Injectable()
export class CloudflareInvalidationService implements CdnProvider {
  private readonly logger = new Logger(CloudflareInvalidationService.name);
  private readonly apiToken: string;
  private readonly zoneId: string;
  private readonly skipInvalidation: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
  ) {
    this.apiToken = this.configService.get<string>('cdn.cloudflare.apiToken') || '';
    this.zoneId = this.configService.get<string>('cdn.cloudflare.zoneId') || '';
    this.skipInvalidation = this.configService.get<boolean>('cdn.skipInvalidation') ?? false;

    if (this.skipInvalidation) {
      this.logger.warn(
        'CDN invalidation disabled (CDN_SKIP_INVALIDATION or missing/placeholder Cloudflare credentials)',
      );
    }
  }

  async invalidate(paths: string[]): Promise<InvalidationResult> {
    if (this.skipInvalidation) {
      this.logger.debug(`Skipped Cloudflare invalidation for ${paths.length} paths`);
      return {
        id: `skipped-${Date.now()}`,
        status: 'completed',
        paths,
      };
    }

    this.logger.log(`Invoked Cloudflare invalidation for ${paths.length} paths`);

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
          { files: paths },
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      return {
        id: response.data.result?.id || 'cf-' + Date.now(),
        status: response.data.success ? 'completed' : 'failed',
        paths,
      };
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(`Cloudflare invalidation failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  async purgeAll(): Promise<void> {
    if (this.skipInvalidation) {
      this.logger.debug('Skipped Cloudflare purge all');
      return;
    }

    this.logger.log('Invoked Cloudflare purge all');

    try {
      await firstValueFrom(
        this.httpService.post(
          `https://api.cloudflare.com/client/v4/zones/${this.zoneId}/purge_cache`,
          { purge_everything: true },
          {
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
    } catch (e: any) {
      const error = e as Error;
      this.logger.error(`Cloudflare purge all failed: ${error.message}`, error.stack);
      throw error;
    }
  }
}
