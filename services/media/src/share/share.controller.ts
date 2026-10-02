import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ShareService } from './share.service';
import { ShareMediaDto } from '../dto/share-media.dto';
import { JwtAuthGuard, CurrentUser, AuthenticatedUser } from '@nestlancer/auth-lib';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  ResourceNotFoundException,
} from '@nestlancer/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';

/**
 * Controller for managing shared media links and permissions.
 * Provides endpoints for creating, listing, and revoking shared access to media.
 *
 * @category Media
 */
@ApiTags('Media - Sharing')
@ApiBearerAuth()
@Controller('media')
@UseGuards(JwtAuthGuard)
@ApiStandardResponses()
export class ShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Lists share links for a specific media file owned by the user.
   *
   * Note: GET /media/shared lives on MediaController so it is not shadowed by GET /media/:id.
   */
  @Get(':id/shares')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'List share links for media',
    description: 'Retrieve active sharing links for a single media file.',
  })
  async listShareLinksForMedia(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') mediaId: string,
  ): Promise<any> {
    const owned = await this.prismaRead.media.findFirst({
      where: { id: mediaId, uploaderId: user.userId },
      select: { id: true },
    });
    if (!owned) {
      throw new ResourceNotFoundException('Media', mediaId);
    }
    return this.shareService.listShareLinksForMedia(mediaId);
  }

  /**
   * Creates a new public or restricted sharing link for a media file.
   *
   * @param user The current authenticated user
   * @param mediaId The media file ID to share
   * @param dto Sharing configuration (expiry, password, etc)
   * @returns Newly created sharing link details
   */
  @Post(':id/share')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Create share link',
    description: 'Generate a secure link for external access to a media file.',
  })
  async createShareLink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') mediaId: string,
    @Body() dto: ShareMediaDto,
  ): Promise<any> {
    return this.shareService.createShareLink(user.userId, mediaId, dto);
  }

  /**
   * Revokes an existing sharing link, disabling further external access.
   *
   * @param user The current authenticated user
   * @param mediaId The media file ID
   * @returns Confirmation of revocation
   */
  @Delete(':id/share')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Revoke all share links for media',
    description: 'Immediately disable all active sharing links for this file.',
  })
  async revokeAllShareLinks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') mediaId: string,
  ): Promise<any> {
    await this.prismaWrite.mediaShareLink.deleteMany({
      where: { mediaId, media: { uploaderId: user.userId } },
    });
    return { id: mediaId, shareRevoked: true };
  }

  @Delete(':id/shares/:shareLinkId')
  @ApiStandardResponse(Object)
  @ApiOperation({
    summary: 'Revoke one share link',
    description: 'Remove a single sharing link by its ID.',
  })
  async revokeShareLinkById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') mediaId: string,
    @Param('shareLinkId') shareLinkId: string,
  ): Promise<any> {
    const owned = await this.prismaRead.media.findFirst({
      where: { id: mediaId, uploaderId: user.userId },
      select: { id: true },
    });
    if (!owned) {
      throw new ResourceNotFoundException('Media', mediaId);
    }
    return this.shareService.revokeShareLinkById(mediaId, shareLinkId);
  }
}
