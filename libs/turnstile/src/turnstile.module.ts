import { Module, DynamicModule, Global } from '@nestjs/common';
import { TurnstileService } from './turnstile.service';
import { TurnstileGuard } from './turnstile.guard';

@Global()
@Module({})
export class TurnstileModule {
  static forRoot(options?: { secretKey?: string; siteKey?: string; bypassToken?: string }): DynamicModule {
    return {
      module: TurnstileModule,
      providers: [
        { provide: 'TURNSTILE_OPTIONS', useValue: options || {} },
        TurnstileService,
        TurnstileGuard,
      ],
      exports: [TurnstileService, TurnstileGuard],
    };
  }
}
