import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';

@Injectable()
export class PostSchedulingService {
  constructor(private readonly prismaWrite: PrismaWriteService) {}

  async schedule(postId: string, scheduledAt: Date) {
    return this.prismaWrite.blogPost.update({
      where: { id: postId },
      data: { scheduledAt },
    });
  }
}
