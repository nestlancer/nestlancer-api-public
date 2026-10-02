import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

interface TagResponse {
  id: string;
  name: string;
  slug: string;
  postCount: number;
  createdAt: Date;
}

@Injectable()
export class TagsService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  async findAll(): Promise<TagResponse[]> {
    const tags = await this.prismaRead.blogTag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag._count.posts,
      createdAt: tag.createdAt,
    }));
  }

  async findBySlug(slug: string): Promise<TagResponse> {
    const tag = await this.prismaRead.blogTag.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!tag) {
      throw new NotFoundException(`Tag with slug "${slug}" not found`);
    }

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag._count.posts,
      createdAt: tag.createdAt,
    };
  }

  async findPopular(limit: number = 10): Promise<TagResponse[]> {
    const tags = await this.prismaRead.blogTag.findMany({
      include: {
        _count: {
          select: { posts: true },
        },
      },
      orderBy: {
        posts: {
          _count: 'desc',
        },
      },
      take: limit,
    });

    return tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag._count.posts,
      createdAt: tag.createdAt,
    }));
  }

  async create(data: { name: string; slug: string }): Promise<TagResponse> {
    const tag = await this.prismaWrite.blogTag.upsert({
      where: { slug: data.slug },
      create: {
        name: data.name,
        slug: data.slug,
      },
      update: {
        name: data.name,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag._count.posts,
      createdAt: tag.createdAt,
    };
  }

  async update(id: string, data: { name: string; slug?: string }): Promise<TagResponse> {
    const existing = await this.prismaRead.blogTag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tag with id "${id}" not found`);
    }

    const tag = await this.prismaWrite.blogTag.update({
      where: { id },
      data: {
        name: data.name,
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return {
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      postCount: tag._count.posts,
      createdAt: tag.createdAt,
    };
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    const existing = await this.prismaRead.blogTag.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Tag with id "${id}" not found`);
    }

    await this.prismaWrite.blogTag.delete({ where: { id } });
    return { deleted: true, id };
  }

  async merge(
    fromTagId: string,
    toTagId: string,
  ): Promise<{ merged: true; from: string; to: string }> {
    const [fromTag, toTag] = await Promise.all([
      this.prismaRead.blogTag.findUnique({
        where: { id: fromTagId },
        include: { posts: { select: { id: true } } },
      }),
      this.prismaRead.blogTag.findUnique({ where: { id: toTagId } }),
    ]);
    if (!fromTag) {
      throw new NotFoundException(`Source tag "${fromTagId}" not found`);
    }
    if (!toTag) {
      throw new NotFoundException(`Target tag "${toTagId}" not found`);
    }

    await this.prismaWrite.$transaction(async (tx) => {
      for (const post of fromTag.posts) {
        await tx.blogPost.update({
          where: { id: post.id },
          data: {
            tags: {
              disconnect: { id: fromTagId },
              connect: { id: toTagId },
            },
          },
        });
      }
      await tx.blogTag.delete({ where: { id: fromTagId } });
    });

    return { merged: true, from: fromTagId, to: toTagId };
  }
}
