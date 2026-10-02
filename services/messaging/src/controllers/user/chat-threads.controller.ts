import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';

import { CreateMessageDto } from '../../dto/create-message.dto';
import {
  AddChatThreadMembersDto,
  DirectThreadDto,
  GroupThreadDto,
  UpdateChatThreadDto,
} from '../../dto/chat-thread.dto';
import { QueryMessagesDto } from '../../dto/query-messages.dto';
import { ChatThreadsService } from '../../services/chat-threads.service';
import { MessagingService } from '../../services/messaging.service';
import { MessageReadService } from '../../services/message-read.service';

@ApiTags('Chat threads')
@ApiBearerAuth()
@Controller('messages/threads')
@ApiStandardResponses()
export class ChatThreadsController {
  constructor(
    private readonly threads: ChatThreadsService,
    private readonly messaging: MessagingService,
    private readonly readService: MessageReadService,
  ) {}

  @Get()
  @Auth()
  @ApiOperation({ summary: 'List direct and group threads for the current user' })
  async list(
    @CurrentUser('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const data = await this.threads.listThreadsForUser(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
    return { status: 'success', data, ...data };
  }

  @Post('direct')
  @Auth()
  @ApiOperation({
    summary: 'Open or resume a direct admin↔client thread',
    description:
      'Clients may omit peerUserId to connect with the platform support admin. Admins must supply peerUserId (the client user id).',
  })
  async direct(@CurrentUser('userId') userId: string, @Body() body: DirectThreadDto) {
    const peerUserId = await this.threads.resolvePeerForDirectThread(userId, body.peerUserId);
    const thread = await this.threads.findOrCreateDirectThread(userId, peerUserId);
    return { status: 'success', data: thread };
  }

  @Post('group')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Create a group thread (admin + multiple clients)' })
  async group(@CurrentUser('userId') userId: string, @Body() body: GroupThreadDto) {
    const thread = await this.threads.createGroupThread(
      userId,
      body.title,
      body.clientUserIds ?? [],
    );
    return { status: 'success', data: thread };
  }

  @Get(':threadId')
  @Auth()
  @ApiOperation({ summary: 'Get chat thread details with members' })
  async getThread(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.getThreadDetail(threadId, userId);
    return { status: 'success', data };
  }

  @Patch(':threadId')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Update a group thread (title)' })
  async updateThread(
    @CurrentUser('userId') userId: string,
    @Param('threadId') threadId: string,
    @Body() body: UpdateChatThreadDto,
  ) {
    const data = await this.threads.updateGroupThreadTitle(userId, threadId, body.title);
    return { status: 'success', data };
  }

  @Get(':threadId/members')
  @Auth()
  @ApiOperation({ summary: 'List members of a chat thread' })
  async listMembers(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.listThreadMembers(threadId, userId);
    return { status: 'success', data };
  }

  @Post(':threadId/members')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Add clients to a group thread' })
  async addMembers(
    @CurrentUser('userId') userId: string,
    @Param('threadId') threadId: string,
    @Body() body: AddChatThreadMembersDto,
  ) {
    const data = await this.threads.addGroupMembers(userId, threadId, body.clientUserIds ?? []);
    return { status: 'success', data };
  }

  @Delete(':threadId/members/:memberUserId')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Remove a client from a group thread' })
  async removeMember(
    @CurrentUser('userId') userId: string,
    @Param('threadId') threadId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    const data = await this.threads.removeGroupMember(userId, threadId, memberUserId);
    return { status: 'success', data };
  }

  @Post(':threadId/leave')
  @Auth()
  @ApiOperation({ summary: 'Leave a group thread (clients only)' })
  async leave(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.leaveGroupThread(userId, threadId);
    return { status: 'success', data };
  }

  @Post(':threadId/archive')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Archive a conversation (direct or group)' })
  async archive(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.archiveThread(userId, threadId);
    return { status: 'success', data };
  }

  @Post(':threadId/unarchive')
  @Auth('ADMIN')
  @ApiOperation({ summary: 'Restore an archived conversation' })
  async unarchive(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.unarchiveThread(userId, threadId);
    return { status: 'success', data };
  }

  @Post(':threadId/user-archive')
  @Auth()
  @ApiOperation({ summary: 'Archive a conversation for the current user only' })
  async userArchive(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.userArchiveThread(userId, threadId);
    return { status: 'success', data };
  }

  @Post(':threadId/user-unarchive')
  @Auth()
  @ApiOperation({ summary: 'Restore a user-archived conversation to the inbox' })
  async userUnarchive(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.userUnarchiveThread(userId, threadId);
    return { status: 'success', data };
  }

  @Post(':threadId/user-hide')
  @Auth()
  @ApiOperation({ summary: 'Delete a conversation from your inbox (admin still has full record)' })
  async userHide(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    const data = await this.threads.userHideThread(userId, threadId);
    return { status: 'success', data };
  }

  @Get(':threadId/messages')
  @Auth()
  @ApiOperation({ summary: 'List root messages in a chat thread' })
  async listMessages(
    @CurrentUser('userId') userId: string,
    @Param('threadId') threadId: string,
    @Query() query: QueryMessagesDto,
  ) {
    const data = await this.messaging.getMessagesForThread(userId, threadId, query);
    return { status: 'success', data, ...data };
  }

  @Post(':threadId/messages')
  @Auth()
  @ApiOperation({ summary: 'Send a message in a chat thread' })
  async send(
    @CurrentUser('userId') userId: string,
    @Param('threadId') threadId: string,
    @Body() dto: CreateMessageDto,
  ) {
    dto.threadId = threadId;
    dto.projectId = undefined;
    const data = await this.messaging.sendMessage(userId, dto);
    return { status: 'success', data };
  }

  @Post(':threadId/read')
  @Auth()
  @ApiOperation({ summary: 'Mark all messages in a thread as read' })
  async markRead(@CurrentUser('userId') userId: string, @Param('threadId') threadId: string) {
    await this.readService.markThreadMessagesAsRead(userId, threadId);
    return { status: 'success' };
  }
}
