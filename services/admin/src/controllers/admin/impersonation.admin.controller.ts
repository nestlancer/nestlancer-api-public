import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { ApiStandardResponses, ApiStandardResponse, UserRole } from '@nestlancer/common';
import { AdminGuard } from '../../guards/admin.guard';

import { ImpersonationService } from '../../services/impersonation.service';
import { ImpersonateUserDto } from '../../dto/impersonate-user.dto';

function adminIdFromRequest(req: {
  user?: { sub?: string };
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const rawUserId = req.headers?.['x-user-id'];
  const fromHeader = Array.isArray(rawUserId) ? rawUserId[0] : rawUserId;
  const adminId = req.user?.sub || fromHeader;
  if (!adminId) {
    throw new BadRequestException('Admin identity missing from request context');
  }
  return adminId;
}

/**
 * Controller for managing administrative user impersonation sessions.
 * Provides endpoints for starting and ending impersonation, and auditing active sessions.
 *
 * @category Admin
 */
@ApiTags('Admin - User Impersonation')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('users')
@ApiStandardResponses()
export class ImpersonationAdminController {
  constructor(private readonly impersonationService: ImpersonationService) {}

  /**
   * Initiates a new impersonation session for a target user.
   *
   * @param userId The unique identifier of the user to be impersonated
   * @param dto Reason and duration for the impersonation
   * @param req Express request object containing the admin's identity
   * @returns Encrypted impersonation token and session details
   */
  @Post(':userId/impersonate')
  @ApiOperation({
    summary: 'Start impersonation session',
    description:
      'Create a temporary session allowing an administrator to act on behalf of another user.',
  })
  @ApiStandardResponse({ message: 'Impersonation session started' })
  async start(
    @Param('userId') userId: string,
    @Body() dto: ImpersonateUserDto,
    @Req() req: any,
  ): Promise<any> {
    return this.impersonationService.startImpersonation(adminIdFromRequest(req), userId, dto);
  }

  /**
   * Gateway alias: POST /api/v1/admin/impersonate/end with `{ "sessionId": "..." }`.
   * Declared before `impersonate/end/:sessionId` so the static path matches first.
   */
  @Post('impersonate/end')
  @ApiOperation({
    summary: 'End impersonation (body sessionId)',
    description:
      'Same as POST …/impersonate/end/:sessionId for clients that send sessionId in JSON.',
  })
  @ApiStandardResponse({ message: 'Impersonation ended' })
  async endByBody(@Body() body: { sessionId?: string }): Promise<any> {
    const sessionId = body?.sessionId?.trim();
    if (!sessionId) {
      throw new BadRequestException('sessionId is required in the request body');
    }
    return this.impersonationService.endImpersonation(sessionId);
  }

  /**
   * Terminates an active impersonation session.
   *
   * @param sessionId The unique identifier of the impersonation session
   * @returns Confirmation of session termination
   */
  @Post('impersonate/end/:sessionId')
  @ApiOperation({
    summary: 'End impersonation session',
    description: 'Gracefully close an active impersonation session and invalidate its tokens.',
  })
  @ApiStandardResponse({ message: 'Impersonation ended' })
  async end(@Param('sessionId') sessionId: string): Promise<any> {
    return this.impersonationService.endImpersonation(sessionId);
  }

  /**
   * Retrieves a list of all currently active impersonation sessions.
   *
   * @returns Array of active session metadata
   */
  @Get('/impersonate/sessions')
  @ApiOperation({
    summary: 'List impersonation sessions',
    description: 'Fetch recent impersonation sessions (active and ended) for auditing purposes.',
  })
  @ApiStandardResponse({ message: 'Sessions retrieved' })
  async listActive(): Promise<any> {
    return this.impersonationService.getActiveSessions();
  }
}
