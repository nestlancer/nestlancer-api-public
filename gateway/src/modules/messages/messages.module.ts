import { Module } from '@nestjs/common';

import { ConversationsAliasController } from './conversations-alias.controller';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  controllers: [MessagesController, ConversationsAliasController],
  providers: [MessagesService],
  exports: [MessagesService],
})
export class MessagesModule {}
