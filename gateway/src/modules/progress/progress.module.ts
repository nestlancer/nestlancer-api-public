import { Module } from '@nestjs/common';

import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { ProxyModule } from '../../proxy/proxy.module';

@Module({
  imports: [ProxyModule],
  controllers: [ProgressController],
  providers: [ProgressService],
  exports: [ProgressService],
})
export class ProgressModule {}
