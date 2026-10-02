import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

function prismaCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

interface LikeResult {
  liked: boolean;
  likeCount: number;
}

interface BookmarkResult {
  bookmarked: boolean;
}

@Injectable()
export class PostInteractionsService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  private findPostBySlug(postSlug: string, select: { id: true; likeCount?: true }) {
    return this.prismaRead.blogPost.findFirst({
      where: { slug: postSlug, deletedAt: null },
      select,
    });
  }

  async toggleLike(postSlug: string, userId: string): Promise<LikeResult> {
    const post = await this.findPostBySlug(postSlug, { id: true, likeCount: true });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    try {
      return await this.prismaWrite.$transaction(async (tx) => {
        const existingLike = await tx.postLike.findUnique({
          where: { postId_userId: { postId: post.id, userId } },
        });

        if (existingLike) {
          await tx.postLike.delete({ where: { id: existingLike.id } });
        } else {
          await tx.postLike.create({ data: { postId: post.id, userId } });
        }

        const likeCount = await tx.postLike.count({ where: { postId: post.id } });
        await tx.blogPost.update({
          where: { id: post.id },
          data: { likeCount },
        });

        return { liked: !existingLike, likeCount };
      });
    } catch (error) {
      // Concurrent like/unlike on the unique (postId, userId) pair. Return the
      // winning row instead of 500ing and desyncing the counter.
      if (prismaCode(error) === 'P2002' || prismaCode(error) === 'P2025') {
        return this.currentLikeState(post.id, userId);
      }
      throw error;
    }
  }

  private async currentLikeState(postId: string, userId: string): Promise<LikeResult> {
    const [existing, likeCount] = await Promise.all([
      this.prismaWrite.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
        select: { id: true },
      }),
      this.prismaWrite.postLike.count({ where: { postId } }),
    ]);
    await this.prismaWrite.blogPost.update({
      where: { id: postId },
      data: { likeCount },
    });
    return { liked: Boolean(existing), likeCount };
  }

  async addBookmark(postSlug: string, userId: string): Promise<BookmarkResult> {
    const post = await this.findPostBySlug(postSlug, { id: true });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    // Check if bookmark already exists
    const existingBookmark = await this.prismaRead.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId,
        },
      },
    });

    if (existingBookmark) {
      return { bookmarked: true }; // Already bookmarked
    }

    try {
      await this.prismaWrite.postBookmark.create({
        data: {
          postId: post.id,
          userId,
        },
      });
    } catch (error) {
      if (prismaCode(error) !== 'P2002') throw error;
    }

    return { bookmarked: true };
  }

  async removeBookmark(postSlug: string, userId: string): Promise<BookmarkResult> {
    const post = await this.findPostBySlug(postSlug, { id: true });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    const existingBookmark = await this.prismaRead.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId,
        },
      },
    });

    if (existingBookmark) {
      await this.prismaWrite.postBookmark.delete({
        where: { id: existingBookmark.id },
      });
    }

    return { bookmarked: false };
  }

  async isLiked(postSlug: string, userId: string): Promise<boolean> {
    const post = await this.findPostBySlug(postSlug, { id: true });

    if (!post) {
      return false;
    }

    const like = await this.prismaRead.postLike.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId,
        },
      },
    });

    return !!like;
  }

  async isBookmarked(postSlug: string, userId: string): Promise<boolean> {
    const post = await this.findPostBySlug(postSlug, { id: true });

    if (!post) {
      return false;
    }

    const bookmark = await this.prismaRead.postBookmark.findUnique({
      where: {
        postId_userId: {
          postId: post.id,
          userId,
        },
      },
    });

    return !!bookmark;
  }

  async getUserBookmarks(userId: string, page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [bookmarks, total] = await Promise.all([
      this.prismaRead.postBookmark.findMany({
        where: { userId },
        include: {
          post: {
            select: {
              id: true,
              slug: true,
              title: true,
              excerpt: true,
              publishedAt: true,
              category: { select: { name: true, slug: true } },
              author: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prismaRead.postBookmark.count({ where: { userId } }),
    ]);

    return {
      items: bookmarks.map((b) => ({
        id: b.id,
        bookmarkedAt: b.createdAt,
        post: b.post,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
