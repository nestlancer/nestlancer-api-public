import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { ProxyModule } from '../../proxy/proxy.module';

@Module({
  imports: [HttpModule, ProxyModule],
  controllers: [HealthController],
  providers: [HealthService],
  exports: [HealthService],
})
export class HealthModule {}
