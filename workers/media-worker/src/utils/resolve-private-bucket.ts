import { ConfigService } from '@nestjs/config';

/** Private media bucket; `storage.privateBucket` is often unset in the worker. */
export function resolvePrivateBucket(configService: ConfigService): string {
  return (
    configService.get<string>('storage.privateBucket') ??
    configService.get<string>('media-worker.privateBucket') ??
    'nestlancer-private'
  );
}
