import { Module } from '@nestjs/common';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule } from '@nestlancer/database';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from '@nestlancer/storage';
import { OutboxModule } from '@nestlancer/outbox';
import { CacheModule } from '@nestlancer/cache';
import { ConfigModule } from '@nestjs/config';
import messagingConfig from './config/messaging.config';

import { MessagesAdminController } from './controllers/admin/messages.admin.controller';
import { ConversationsController } from './controllers/user/conversations.controller';
import { MessagesController } from './controllers/user/messages.controller';
import { MessageThreadsController } from './controllers/user/message-threads.controller';
import { ChatThreadsController } from './controllers/user/chat-threads.controller';

import {
  MessagingService,
  ConversationsService,
  MessageThreadsService,
  MessageSearchService,
  MessageReadService,
  UnreadCountService,
  MessagingAccessService,
  ChatThreadsService,
  MessagingRealtimePublisher,
  ThreadMemberStintService,
  ThreadUserPrefsService,
  ChatThreadSystemMessageService,
} from './services';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    ConfigModule.forRoot({ load: [messagingConfig], isGlobal: true }),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
    OutboxModule.forRoot(),
    CacheModule.forRoot(),
  ],
  controllers: [
    MessagesAdminController,
    ConversationsController,
    MessagesController,
    MessageThreadsController,
    ChatThreadsController,
  ],
  providers: [
    MessagingService,
    MessagingRealtimePublisher,
    MessagingAccessService,
    ChatThreadsService,
    ConversationsService,
    MessageThreadsService,
    MessageSearchService,
    MessageReadService,
    UnreadCountService,
    ThreadMemberStintService,
    ThreadUserPrefsService,
    ChatThreadSystemMessageService,
  ],
})
export class AppModule {}
