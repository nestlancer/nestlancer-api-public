import { Injectable, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { HashingService } from '@nestlancer/crypto';
import { DEFAULT_SHARE_EXPIRY_SECONDS, ShareMediaDto } from '../dto/share-media.dto';
import { ResourceNotFoundException } from '@nestlancer/common';
import { NestlancerConfigService } from '@nestlancer/config';
import { MediaStatus } from '@prisma/client';
import * as crypto from 'crypto';

type ShareLinkRow = {
  id: string;
  token: string;
  purpose: string | null;
  expiresAt: Date | null;
  createdAt: Date;
  passwordHash: string | null;
  allowedEmails: string[];
};

@Injectable()
export class ShareService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly hashingService: HashingService,
    private readonly configService: NestlancerConfigService,
  ) {}

  buildShareUrl(token: string): string {
    const baseUrl =
      this.configService.getOptional<string>('FRONTEND_URL') ??
      this.configService.getOptional<string>('WEB_URL') ??
      this.configService.getOptional<string>('APP_URL') ??
      'https://nestlancer.com';
    return `${baseUrl.replace(/\/$/, '')}/share/${token}`;
  }

  private mapShareLink(share: ShareLinkRow) {
    return {
      id: share.id,
      token: share.token,
      purpose: share.purpose,
      shareUrl: this.buildShareUrl(share.token),
      expiresAt: share.expiresAt,
      createdAt: share.createdAt,
      passwordProtected: !!share.passwordHash,
      allowedEmails: share.allowedEmails,
    };
  }

  /** Delete expired links so they cannot be reused after timeout. */
  async purgeExpiredShareLinks(mediaId?: string): Promise<number> {
    const result = await this.prismaWrite.mediaShareLink.deleteMany({
      where: {
        ...(mediaId ? { mediaId } : {}),
        expiresAt: { not: null, lt: new Date() },
      },
    });
    return result.count;
  }

  async createShareLink(userId: string, mediaId: string, dto: ShareMediaDto) {
    const media = await this.prismaRead.media.findFirst({
      where: { id: mediaId, uploaderId: userId },
    });

    if (!media) {
      throw new ResourceNotFoundException('Media', mediaId);
    }

    return this.createShareLinkForMedia(mediaId, dto);
  }

  /** Admin or internal: create a share link without uploader ownership check. */
  async createShareLinkForMedia(mediaId: string, dto: ShareMediaDto) {
    const media = await this.prismaRead.media.findUnique({ where: { id: mediaId } });

    if (!media) {
      throw new ResourceNotFoundException('Media', mediaId);
    }

    if (media.status !== MediaStatus.READY) {
      throw new BadRequestException('Share links can only be created for READY media');
    }

    const purpose = dto.purpose?.trim();
    if (!purpose) {
      throw new BadRequestException('Share link purpose is required');
    }

    const expiresInSeconds = dto.expiresInSeconds ?? DEFAULT_SHARE_EXPIRY_SECONDS;
    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000);
    const token = crypto.randomBytes(32).toString('hex');
    const passwordHash = dto.password ? await this.hashingService.hash(dto.password) : null;

    const shareLink = await this.prismaWrite.mediaShareLink.create({
      data: {
        mediaId,
        token,
        purpose,
        expiresAt,
        passwordHash,
        allowedEmails: dto.allowedEmails || [],
      },
    });

    return this.mapShareLink(shareLink);
  }

  async listShareLinksForMedia(mediaId: string) {
    await this.purgeExpiredShareLinks(mediaId);

    const shares = await this.prismaRead.mediaShareLink.findMany({
      where: { mediaId },
      select: {
        id: true,
        token: true,
        purpose: true,
        expiresAt: true,
        createdAt: true,
        passwordHash: true,
        allowedEmails: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      data: shares.map((share) => this.mapShareLink(share)),
      total: shares.length,
    };
  }

  /** List all share links created for media owned by the given uploader. */
  async listSharesByUploader(uploaderId: string) {
    await this.purgeExpiredShareLinks();
    const shares = await this.prismaRead.mediaShareLink.findMany({
      where: { media: { uploaderId } },
      include: {
        media: { select: { id: true, filename: true, mimeType: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const data = shares.map((share) => ({
      ...this.mapShareLink(share),
      media: share.media,
    }));
    return { data, total: data.length };
  }

  async revokeShareLinksForMedia(mediaId: string) {
    const media = await this.prismaRead.media.findUnique({
      where: { id: mediaId },
      select: { id: true },
    });
    if (!media) {
      throw new ResourceNotFoundException('Media', mediaId);
    }

    const result = await this.prismaWrite.mediaShareLink.deleteMany({ where: { mediaId } });
    return { id: mediaId, shareRevoked: true, deleted: result.count };
  }

  async revokeShareLinkById(mediaId: string, shareLinkId: string) {
    const shareLink = await this.prismaRead.mediaShareLink.findFirst({
      where: { id: shareLinkId, mediaId },
    });

    if (!shareLink) {
      throw new ResourceNotFoundException('ShareLink', shareLinkId);
    }

    await this.prismaWrite.mediaShareLink.delete({ where: { id: shareLinkId } });
    return { id: shareLinkId, mediaId, revoked: true };
  }

  async validateShareLink(token: string, password?: string) {
    const shareLink = await this.prismaRead.mediaShareLink.findUnique({
      where: { token },
      include: { media: true },
    });

    if (!shareLink) {
      throw new ResourceNotFoundException('ShareLink', token);
    }

    if (shareLink.expiresAt && new Date() > shareLink.expiresAt) {
      await this.prismaWrite.mediaShareLink.delete({ where: { id: shareLink.id } });
      throw new ForbiddenException('Share link has expired and was revoked');
    }

    if (shareLink.passwordHash) {
      if (!password) {
        throw new ForbiddenException('Password required');
      }

      const isValid = await this.hashingService.compare(password, shareLink.passwordHash);
      if (!isValid) {
        throw new ForbiddenException('Invalid password');
      }
    }

    return shareLink.media;
  }

  async revokeShareLink(userId: string, token: string) {
    const shareLink = await this.prismaRead.mediaShareLink.findUnique({
      where: { token },
      include: { media: { select: { uploaderId: true } } },
    });

    if (!shareLink) {
      throw new ResourceNotFoundException('ShareLink', token);
    }

    if ((shareLink.media as { uploaderId: string }).uploaderId !== userId) {
      throw new ForbiddenException('You do not own this share link');
    }

    await this.prismaWrite.mediaShareLink.delete({
      where: { token },
    });

    return { revoked: true };
  }
}
