import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { ApiStandardResponses, Public } from '@nestlancer/common';

import { ResolveShareDto } from '../dto/resolve-share.dto';
import { ShareService } from './share.service';
import { enrichMediaUrls } from '../media/media-urls.util';
import { MediaStorageService } from '../storage/storage.service';

/**
 * Public endpoints for validating share tokens (no JWT).
 */
@ApiTags('Media - Public Share')
@Controller('share')
@ApiStandardResponses()
export class PublicShareController {
  constructor(
    private readonly shareService: ShareService,
    private readonly storageService: MediaStorageService,
  ) {}

  private async resolveSharePayload(token: string, password?: string) {
    const media = await this.shareService.validateShareLink(token, password);
    const enriched = await enrichMediaUrls(
      media as unknown as Record<string, unknown>,
      this.storageService,
    );
    const urls = (enriched.urls ?? {}) as Record<string, string>;
    return {
      id: enriched.id,
      filename: enriched.filename,
      mimeType: enriched.mimeType,
      status: enriched.status,
      urls: {
        ...urls,
        default: urls.preview ?? urls.original ?? urls.thumbnail,
        download: urls.original ?? urls.preview,
      },
    };
  }

  @Public()
  @Get(':token')
  @ApiOperation({
    summary: 'Resolve a public share link (no password)',
    description:
      'Returns metadata for unprotected links. Password-protected links require POST with the password in the request body.',
  })
  async resolveShare(@Param('token') token: string): Promise<unknown> {
    return this.resolveSharePayload(token);
  }

  @Public()
  @Post(':token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resolve a password-protected public share link',
    description: 'Send `{ "password": "..." }` in the body. Never pass passwords in the URL.',
  })
  async resolveShareWithPassword(
    @Param('token') token: string,
    @Body() dto: ResolveShareDto,
  ): Promise<unknown> {
    return this.resolveSharePayload(token, dto.password);
  }
}
