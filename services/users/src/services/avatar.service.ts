import { Injectable } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { StorageService } from '@nestlancer/storage';
import { BusinessLogicException } from '@nestlancer/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AvatarService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly storageService: StorageService,
    private readonly config: ConfigService,
  ) {}

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    const allowedMimeTypes = this.config.get<string[]>('usersService.avatar.allowedMimeTypes') || [
      'image/jpeg',
      'image/png',
      'image/webp',
    ];
    const maxSize = this.config.get<number>('usersService.avatar.maxSize') || 5242880;

    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BusinessLogicException('Unsupported avatar format', 'USER_015');
    }

    if (file.size > maxSize) {
      throw new BusinessLogicException('Avatar file too large', 'USER_014');
    }

    const bucket = this.config.get<string>('usersService.avatar.s3Bucket') || 'avatars';
    const key = `users/${userId}/avatar_${Date.now()}`;

    // Upload to storage
    const uploadResult = await this.storageService.upload(bucket, key, file.buffer, file.mimetype);
    const url = uploadResult.url;

    // Get old avatar to delete
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });

    // Update DB
    try {
      await this.prismaWrite.user.update({
        where: { id: userId },
        data: { avatar: url },
      });
    } catch (error) {
      await this.storageService.delete(bucket, key).catch((e) => {
        console.error('Failed to cleanup avatar from S3 after DB failure', e);
      });
      throw error;
    }

    // Delete old avatar from storage to prevent orphaned files
    if (user?.avatar) {
      const oldKey = this.extractKeyFromUrl(user.avatar);
      if (oldKey) {
        const bucket = this.config.get<string>('usersService.avatar.s3Bucket') || 'avatars';
        await this.storageService.delete(bucket, oldKey);
      }
    }

    return this.resolveAvatarDisplay(url).then((fields) => ({
      avatarUrl: fields.avatarUrl ?? url,
      ...fields,
    }));
  }

  async resolveAvatarDisplay(avatar: string | null | undefined): Promise<{
    avatar?: string;
    avatarUrl?: string;
    avatarSignedUrl?: string;
  }> {
    if (!avatar) return {};

    const bucket = this.config.get<string>('usersService.avatar.s3Bucket') || 'nestlancer-avatars';
    const key = this.extractKeyFromUrl(avatar);

    if (!key) {
      return { avatar, avatarUrl: avatar, avatarSignedUrl: avatar };
    }

    try {
      const signedUrl = await this.storageService.getSignedUrl({
        bucket,
        key,
        operation: 'get',
        expiresIn: Number(process.env.S3_PRESIGNED_URL_EXPIRY || 900),
      });
      return { avatar, avatarUrl: signedUrl, avatarSignedUrl: signedUrl };
    } catch {
      return { avatar, avatarUrl: avatar };
    }
  }

  async removeAvatar(userId: string) {
    const user = await this.prismaRead.user.findUnique({ where: { id: userId } });

    if (user?.avatar) {
      await this.prismaWrite.user.update({
        where: { id: userId },
        data: { avatar: null },
      });

      // Delete avatar from storage to prevent orphaned files
      const key = this.extractKeyFromUrl(user.avatar);
      if (key) {
        const bucket = this.config.get<string>('usersService.avatar.s3Bucket') || 'avatars';
        await this.storageService.delete(bucket, key);
      }
    }

    return true;
  }

  /**
   * Extracts the storage key from an avatar URL.
   * Avatar keys follow the pattern: users/{userId}/avatar_{timestamp}
   */
  private extractKeyFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      // Extract path after bucket name — storage keys start with "users/"
      const pathParts = urlObj.pathname.split('/');
      const usersIndex = pathParts.findIndex((p) => p === 'users');
      if (usersIndex >= 0) {
        return pathParts.slice(usersIndex).join('/');
      }
      // Fallback: use full path without leading slash
      return urlObj.pathname.startsWith('/') ? urlObj.pathname.slice(1) : urlObj.pathname;
    } catch {
      // If not a valid URL, treat as a key itself
      return url;
    }
  }
}
