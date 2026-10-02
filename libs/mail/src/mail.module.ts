import { Module, DynamicModule, Global } from '@nestjs/common';
import { MailService } from './mail.service';

export interface MailModuleAsyncOptions {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<any> | any;
}

@Global()
@Module({})
export class MailModule {
  static forRoot(options?: { provider?: string }): DynamicModule {
    return {
      module: MailModule,
      providers: [{ provide: 'MAIL_OPTIONS', useValue: options || {} }, MailService],
      exports: [MailService],
    };
  }

  static forRootAsync(options: MailModuleAsyncOptions): DynamicModule {
    return {
      module: MailModule,
      providers: [
        {
          provide: 'MAIL_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        MailService,
      ],
      exports: [MailService],
    };
  }
}
