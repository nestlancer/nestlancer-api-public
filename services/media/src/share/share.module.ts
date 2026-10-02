import { Module } from '@nestjs/common';
import { ShareController } from './share.controller';
import { PublicShareController } from './public-share.controller';
import { ShareService } from './share.service';
import { DatabaseModule } from '@nestlancer/database';
import { StorageModule } from '../storage/storage.module';
import { CryptoModule } from '@nestlancer/crypto';

@Module({
  imports: [DatabaseModule, StorageModule, CryptoModule],
  controllers: [ShareController, PublicShareController],
  providers: [ShareService],
  exports: [ShareService],
})
export class ShareModule {}
