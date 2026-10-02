import { Module } from '@nestjs/common';

import { MediaController } from './media.controller';
import { MediaAdminGatewayController } from './media-admin.gateway.controller';
import { ShareGatewayController } from './share.gateway.controller';
import { StatsAliasController } from './stats-alias.controller';
import { MediaService } from './media.service';

@Module({
  controllers: [
    MediaController,
    MediaAdminGatewayController,
    ShareGatewayController,
    StatsAliasController,
  ],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
