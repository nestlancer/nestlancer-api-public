import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { NestlancerConfigModule } from '@nestlancer/config';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { DatabaseModule } from '@nestlancer/database';
import { QueueModule } from '@nestlancer/queue';
import { OutboxModule } from '@nestlancer/outbox';
import { CacheModule } from '@nestlancer/cache';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { StorageModule } from '@nestlancer/storage';
import { DocumentsModule } from '@nestlancer/documents';

import { UsersController } from './controllers/users.controller';
import { AuditLogsAdminController } from './controllers/audit-logs.admin.controller';
import { UsersAdminController } from './controllers/users.admin.controller';
import { ProfileService } from './services/profile.service';
import { PreferencesService } from './services/preferences.service';
import { AvatarService } from './services/avatar.service';
import { SessionsService } from './services/sessions.service';
import { AccountService } from './services/account.service';
import { TwoFactorService } from './services/two-factor.service';
import { ActivityService } from './services/activity.service';
import { UsersAdminService } from './services/users.admin.service';

import usersConfig from './config/users.config';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    NestConfigModule.forFeature(usersConfig),
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    DatabaseModule.forRoot(),
    QueueModule.forRoot(),
    OutboxModule.forRoot(),
    CacheModule.forRoot(),
    AuthLibModule,
    StorageModule.forRoot(),
    DocumentsModule,
  ],
  controllers: [UsersController, UsersAdminController, AuditLogsAdminController],
  providers: [
    ProfileService,
    PreferencesService,
    AvatarService,
    SessionsService,
    AccountService,
    TwoFactorService,
    ActivityService,
    UsersAdminService,
  ],
})
export class AppModule {}
