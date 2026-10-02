import { Module, DynamicModule, Global } from '@nestjs/common';
import { TracingService } from './tracing.service';

@Global()
@Module({})
export class TracingModule {
  static forRoot(): DynamicModule {
    return { module: TracingModule, providers: [TracingService], exports: [TracingService] };
  }
}
