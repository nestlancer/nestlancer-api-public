import { Module } from '@nestjs/common';
import { PushController } from './push.controller';
import { DatabaseModule } from '@nestlancer/database';

@Module({
  imports: [DatabaseModule],
  controllers: [PushController],
})
export class PushModule {}
