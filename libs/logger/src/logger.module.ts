import { Module, DynamicModule, Global } from '@nestjs/common';
import { NestlancerLoggerService } from './logger.service';

@Global()
@Module({})
export class LoggerModule {
  static forRoot(options?: { level?: string }): DynamicModule {
    return {
      module: LoggerModule,
      providers: [{ provide: 'LOGGER_OPTIONS', useValue: options || {} }, NestlancerLoggerService],
      exports: [NestlancerLoggerService],
    };
  }
}
