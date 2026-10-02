import { Module, DynamicModule, Global } from '@nestjs/common';
import { NestlancerConfigService } from '@nestlancer/config';
import { StorageService } from './storage.service';
import { LocalProvider } from './providers/local.provider';
import { S3Provider } from './providers/s3.provider';
import {
  StorageModuleOptions,
  S3StorageConfig,
  LocalStorageConfig,
} from './interfaces/storage.interface';

@Global()
@Module({})
export class StorageModule {
  static forRoot(options?: Partial<StorageModuleOptions>): DynamicModule {
    return {
      module: StorageModule,
      providers: [
        {
          provide: 'STORAGE_OPTIONS',
          inject: [NestlancerConfigService],
          useFactory: (config: NestlancerConfigService): StorageModuleOptions => {
            const provider =
              options?.provider || (config.storageProvider as 's3' | 'local') || 'local';

            const normalizeEndpoint = (value: string | undefined) =>
              value ? (/^https?:\/\//.test(value) ? value : `https://${value}`) : undefined;
            // Prefer private Tailscale/LAN endpoint for SDK I/O; keep public/CDN for browsers.
            const normalizedEndpoint =
              normalizeEndpoint(config.s3LocalEndpoint) ||
              normalizeEndpoint(config.s3Endpoint);
            const publicEndpoint =
              normalizeEndpoint(config.s3PublicEndpoint) ||
              normalizeEndpoint(config.cdnPublicBaseUrl) ||
              normalizeEndpoint(config.s3Endpoint) ||
              normalizedEndpoint;

            const s3Config: S3StorageConfig = options?.s3 || {
              accessKeyId: config.s3AccessKeyId,
              secretAccessKey: config.s3SecretAccessKey,
              endpoint: normalizedEndpoint,
              publicEndpoint,
              region: config.s3Region,
              forcePathStyle: true,
            };

            const localConfig: LocalStorageConfig = options?.local || {
              basePath: config.localStoragePath,
              baseUrl: config.localStorageUrl,
            };

            return { ...(options || {}), provider, s3: s3Config, local: localConfig };
          },
        },
        {
          provide: 'S3_CONFIG',
          inject: ['STORAGE_OPTIONS'],
          useFactory: (opts: StorageModuleOptions): S3StorageConfig => opts.s3!,
        },
        {
          provide: 'LOCAL_STORAGE_CONFIG',
          inject: ['STORAGE_OPTIONS'],
          useFactory: (opts: StorageModuleOptions): LocalStorageConfig => opts.local!,
        },
        LocalProvider,
        S3Provider,
        StorageService,
      ],
      exports: [StorageService],
    };
  }
}
