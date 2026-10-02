import { Module, DynamicModule, Global } from '@nestjs/common';
import { AccessTokenRevocationService } from './access-token-revocation.service';
import { CacheService } from './cache.service';
import { WorkerHeartbeatService } from './worker-heartbeat.service';

@Global()
@Module({})
export class CacheModule {
  static forRoot(options?: { redisUrl?: string }): DynamicModule {
    return {
      module: CacheModule,
      providers: [
        { provide: 'CACHE_OPTIONS', useValue: options || {} },
        CacheService,
        WorkerHeartbeatService,
        AccessTokenRevocationService,
      ],
      exports: [CacheService, WorkerHeartbeatService, AccessTokenRevocationService],
    };
  }
}
