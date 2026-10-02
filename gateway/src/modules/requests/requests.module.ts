import { Module } from '@nestjs/common';

import { RequestsController } from './requests.controller';
import { ServicesController } from './services.controller';
import { RequestsService } from './requests.service';

@Module({
  controllers: [RequestsController, ServicesController],
  providers: [RequestsService],
  exports: [RequestsService],
})
export class RequestsModule {}
