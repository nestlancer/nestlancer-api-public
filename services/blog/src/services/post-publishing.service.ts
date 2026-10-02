import { Injectable } from '@nestjs/common';
import { PrismaWriteService } from '@nestlancer/database';
import { OutboxService } from '@nestlancer/outbox';
import { PostStatus } from '@nestlancer/common';

@Injectable()
export class PostPublishingService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly outboxService: OutboxService,
  ) {}

  async publish(postId: string) {
    const result = await this.prismaWrite.$transaction(async (tx: any) => {
      const post = await tx.blogPost.update({
        where: { id: postId },
        data: {
          status: PostStatus.PUBLISHED,
          publishedAt: new Date(),
        },
      });

      await this.outboxService.createEvent(
        {
          aggregateType: 'BLOG_POST',
          aggregateId: post.id,
          type: 'BLOG_POST_PUBLISHED',
          payload: { postId: post.id },
        },
        tx,
      );
      return post;
    });
    // Invalidate cache implicitly or explicitly handled in interceptors typically
    return result;
  }

  async unpublish(postId: string) {
    return this.prismaWrite.blogPost.update({
      where: { id: postId },
      data: {
        status: PostStatus.DRAFT,
        publishedAt: null,
      },
    });
  }

  async archive(postId: string) {
    return this.prismaWrite.blogPost.update({
      where: { id: postId },
      data: {
        status: PostStatus.ARCHIVED,
      },
    });
  }
}
