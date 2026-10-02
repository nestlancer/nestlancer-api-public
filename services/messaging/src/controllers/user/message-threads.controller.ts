import { Controller, Get, Post, Param, Query, Body, NotFoundException } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { MessageThreadsService, MessagingAccessService, MessagingService } from '../../services';
import { PrismaReadService } from '@nestlancer/database';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CreateMessageDto } from '../../dto/create-message.dto';

/**
 * Controller for managing hierarchical message threads (replies).
 *
 * @category Messaging
 */
@ApiTags('Message Threads')
@ApiBearerAuth()
@Auth()
@Controller('messages/:messageId/threads')
@ApiStandardResponses()
export class MessageThreadsController {
  constructor(
    private readonly threadsService: MessageThreadsService,
    private readonly messagingAccess: MessagingAccessService,
    private readonly messagingService: MessagingService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves all replies associated with a specific parent message.
   *
   * @param messageId The root message ID
   * @param query Pagination and filtering parameters
   * @returns List of messages in the thread
   */
  @Get()
  @ApiOperation({
    summary: 'List thread replies',
    description: 'Fetch all messages that were sent in response to the specified parent message.',
  })
  async getThreadReplies(
    @CurrentUser('userId') userId: string,
    @Param('messageId') messageId: string,
    @Query() query: any,
  ): Promise<any> {
    await this.messagingAccess.requireMessageAccess(userId, messageId);
    const data = await this.threadsService.getThreadReplies(messageId, query);
    return { status: 'success', data, ...data };
  }

  @Post()
  @ApiOperation({ summary: 'Reply in thread' })
  async replyInThread(
    @CurrentUser('userId') userId: string,
    @Param('messageId') messageId: string,
    @Body() dto: CreateMessageDto,
  ): Promise<any> {
    await this.messagingAccess.requireMessageAccess(userId, messageId);
    const parent = await this.prismaRead.message.findUnique({
      where: { id: messageId },
      select: { projectId: true, threadId: true, deletedAt: true },
    });
    if (!parent || parent.deletedAt) {
      throw new NotFoundException('Parent message not found');
    }
    dto.replyToId = messageId;
    dto.projectId = parent.projectId ?? undefined;
    dto.threadId = parent.threadId ?? undefined;
    const data = await this.messagingService.sendMessage(userId, dto);
    return { status: 'success', data };
  }
}
