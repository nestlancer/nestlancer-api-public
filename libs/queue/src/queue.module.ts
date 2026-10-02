import { Module, DynamicModule, Global } from '@nestjs/common';
import { QueuePublisherService } from './queue-publisher.service';
import { QueueConsumerService } from './queue-consumer.service';
import { DlqService } from './dlq.service';

export interface QueueModuleAsyncOptions {
  imports?: any[];
  inject?: any[];
  useFactory: (...args: any[]) => Promise<{ url?: string }> | { url?: string };
}

@Global()
@Module({})
export class QueueModule {
  static forRoot(options?: { url?: string }): DynamicModule {
    return {
      module: QueueModule,
      providers: [
        { provide: 'QUEUE_OPTIONS', useValue: options || {} },
        QueuePublisherService,
        QueueConsumerService,
        DlqService,
      ],
      exports: [QueuePublisherService, QueueConsumerService, DlqService],
    };
  }

  static forRootAsync(options: QueueModuleAsyncOptions): DynamicModule {
    return {
      module: QueueModule,
      imports: options.imports || [],
      providers: [
        {
          provide: 'QUEUE_OPTIONS',
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
        QueuePublisherService,
        QueueConsumerService,
        DlqService,
      ],
      exports: [QueuePublisherService, QueueConsumerService, DlqService],
    };
  }
}
