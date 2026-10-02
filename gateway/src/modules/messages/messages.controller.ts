import { Controller, Get, Post, Patch, Delete, Param, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';

import { Request } from 'express';

import { ApiStandardResponses, Public } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Messages Gateway Controller
 * Routes messaging requests to the Messaging Service.
 *
 * Messaging service: prefix api + URI v1
 * Controllers: @Controller('conversations'), @Controller('messages'),
 *              @Controller('messages/:messageId/threads')
 *
 * Since the gateway controller is @Controller('messages'), paths like
 * /api/v1/messages/... will be forwarded as-is to the messaging service
 * which has @Controller('messages'). For conversations-related endpoints,
 * we use pathOverride to route to /api/v1/conversations/...
 */
@Controller('messages')
@ApiTags('messages')
@ApiBearerAuth()
@ApiStandardResponses()
export class MessagesController {
  constructor(private readonly proxy: HttpProxyService) {}

  // --- Conversations (maps to @Controller('conversations')) ---

  @Get('conversations')
  @ApiOperation({ summary: 'List user conversations' })
  async getConversations(@Req() req: Request) {
    return this.proxy.forward('messaging', req, undefined, '/api/v1/conversations');
  }

  @Get('conversations/unread-count')
  @ApiOperation({ summary: 'Get total unread message count' })
  async getUnreadCount(@Req() req: Request) {
    return this.proxy.forward('messaging', req, undefined, '/api/v1/conversations/unread-count');
  }

  // --- Messages (maps to @Controller('messages')) ---

  @Get()
  @ApiOperation({ summary: 'List messages' })
  async listMessages(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post()
  @ApiOperation({ summary: 'Send a message' })
  async sendMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Messaging service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Unread messages count' })
  async messagesUnreadCount(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages' })
  async searchMessagesRoute(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('threads')
  @ApiOperation({ summary: 'List chat threads (direct / group)' })
  async listChatThreads(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/direct')
  @ApiOperation({ summary: 'Open or resume direct admin↔client thread' })
  async chatThreadsDirect(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/group')
  @ApiOperation({ summary: 'Create group thread (admin)' })
  async chatThreadsGroup(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('threads/:threadId')
  @ApiOperation({ summary: 'Get chat thread details with members' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async getChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Patch('threads/:threadId')
  @ApiOperation({ summary: 'Update group thread title' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async patchChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('threads/:threadId/members')
  @ApiOperation({ summary: 'List chat thread members' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async listChatThreadMembers(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/members')
  @ApiOperation({ summary: 'Add members to group thread' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async addChatThreadMembers(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Delete('threads/:threadId/members/:memberUserId')
  @ApiOperation({ summary: 'Remove member from group thread' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  @ApiParam({ name: 'memberUserId', description: 'User UUID to remove' })
  async removeChatThreadMember(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/leave')
  @ApiOperation({ summary: 'Leave group thread' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async leaveChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/archive')
  @ApiOperation({ summary: 'Archive conversation (direct or group)' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async archiveChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/unarchive')
  @ApiOperation({ summary: 'Restore archived conversation' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async unarchiveChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/user-archive')
  @ApiOperation({ summary: 'Archive conversation for current user' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async userArchiveChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/user-unarchive')
  @ApiOperation({ summary: 'Restore user-archived conversation' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async userUnarchiveChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/user-hide')
  @ApiOperation({ summary: 'Delete conversation from user inbox' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async userHideChatThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('threads/:threadId/messages')
  @ApiOperation({ summary: 'List messages in a chat thread' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async chatThreadMessages(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/messages')
  @ApiOperation({ summary: 'Send message in chat thread' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async chatThreadSend(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('threads/:threadId/read')
  @ApiOperation({ summary: 'Mark chat thread as read' })
  @ApiParam({ name: 'threadId', description: 'Thread UUID' })
  async chatThreadMarkRead(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('project/:projectId/attachments')
  @ApiOperation({ summary: 'List file attachments in project chat' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectAttachments(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('projects/:projectId')
  @ApiOperation({ summary: 'Send message in project thread (alias)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async sendProjectMessagePlural(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('projects/:projectId')
  @ApiOperation({ summary: 'List messages in a project thread (canonical)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectThreadPlural(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('project/:projectId')
  @ApiOperation({ summary: 'List messages in a project thread' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectThread(@Req() req: Request, @Param('projectId') projectId: string) {
    return this.proxy.forward(
      'messaging',
      req,
      undefined,
      `/api/v1/messages/projects/${encodeURIComponent(projectId)}`,
    );
  }

  @Post('project/:projectId')
  @ApiOperation({ summary: 'Send message in project thread' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async sendProjectMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('project/:projectId/read')
  @ApiOperation({ summary: 'Mark all project messages as read' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async markProjectMessagesRead(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get message details' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async getMessageDetails(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edit message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async patchMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async deleteMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark message as read' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async markAsRead(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post(':id/pin')
  @ApiOperation({ summary: 'Pin message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async pinMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post(':id/unpin')
  @ApiOperation({ summary: 'Unpin message' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async unpinMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post(':id/flag')
  @ApiOperation({ summary: 'Flag message for moderation' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async flagMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  // --- Threads (maps to @Controller('messages/:messageId/threads')) ---

  @Get(':messageId/threads')
  @ApiOperation({ summary: 'Get message threads' })
  @ApiParam({ name: 'messageId', description: 'Parent message UUID' })
  async getThreads(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post(':messageId/threads')
  @ApiOperation({ summary: 'Reply in thread' })
  @ApiParam({ name: 'messageId', description: 'Parent message UUID' })
  async replyInThread(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }
}
