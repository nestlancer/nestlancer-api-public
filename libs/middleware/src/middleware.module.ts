import { Module, Global } from '@nestjs/common';
import { ThrottleGuard } from './guards/throttle.guard';
import { MaintenanceGuard } from './guards/maintenance.guard';

@Global()
@Module({
  providers: [ThrottleGuard, MaintenanceGuard],
  exports: [ThrottleGuard, MaintenanceGuard],
})
export class MiddlewareModule {}
