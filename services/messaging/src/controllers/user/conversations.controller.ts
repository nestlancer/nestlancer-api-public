import { Controller, Get, Query } from '@nestjs/common';
import { ApiStandardResponses } from '@nestlancer/common';
import { Auth, CurrentUser } from '@nestlancer/auth-lib';
import { ConversationsService, UnreadCountService } from '../../services';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

/**
 * Controller for managing user conversations.
 * Handles listing conversations and tracking unread message counts.
 *
 * @category Messaging
 */
@ApiTags('Conversations')
@ApiBearerAuth()
@Auth()
@Controller('conversations')
@ApiStandardResponses()
export class ConversationsController {
  constructor(
    private readonly conversationsService: ConversationsService,
    private readonly unreadCount: UnreadCountService,
  ) {}

  /**
   * Retrieves a list of all active conversations for the current user.
   *
   * @param userId Authenticated user ID
   * @param query Pagination and filtering parameters
   * @returns Paginated list of conversations
   */
  @Get()
  @ApiOperation({
    summary: 'List user conversations',
    description: 'Fetch all chat threads the user is involved in.',
  })
  async getConversations(@CurrentUser('userId') userId: string, @Query() query: any): Promise<any> {
    const data = await this.conversationsService.getConversations(userId, query);
    return { status: 'success', data, ...data };
  }

  /**
   * Retrieves the total count of unread messages across all conversations.
   *
   * @param userId Authenticated user ID
   * @returns Total unread message count
   */
  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread count',
    description: 'Fetch the cumulative number of messages the user has not yet checked.',
  })
  async getUnreadCount(@CurrentUser('userId') userId: string): Promise<any> {
    const data = await this.unreadCount.getUnreadCount(userId);
    return { status: 'success', data };
  }
}
