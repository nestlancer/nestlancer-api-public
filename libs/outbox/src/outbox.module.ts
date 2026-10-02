import { Module, DynamicModule, Global } from '@nestjs/common';
import { OutboxService } from './outbox.service';
import { OutboxPollerService } from './outbox-poller.service';
import { OutboxRepository } from './outbox.repository';
import { OutboxPrismaInitializer } from './outbox-prisma.initializer';

@Global()
@Module({})
export class OutboxModule {
  static forRoot(): DynamicModule {
    return {
      module: OutboxModule,
      providers: [
        OutboxService,
        OutboxPollerService,
        OutboxRepository,
        OutboxPrismaInitializer,
      ],
      exports: [OutboxService],
    };
  }
}
