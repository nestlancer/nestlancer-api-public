import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { PostStatus } from '@nestlancer/common';
import { UpdatePostDto } from '../dto/update-post.dto';

@Injectable()
export class BlogAdminService {
  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly configService: ConfigService,
  ) {}

  async findAll(query: any) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const { status, categoryId } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (categoryId) where.categoryId = categoryId;
    if (query.featured === 'true' || query.featured === true) where.featured = true;
    const search = typeof query.search === 'string' ? query.search.trim() : '';
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { slug: { contains: search, mode: 'insensitive' } },
        { excerpt: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, totalItems] = await Promise.all([
      this.prismaRead.blogPost.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
        include: {
          category: true,
          tags: true,
          author: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prismaRead.blogPost.count({ where }),
    ]);

    return {
      items,
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  async findById(id: string) {
    const item = await this.prismaRead.blogPost.findUnique({
      where: { id },
      include: {
        category: true,
        tags: true,
        author: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    if (!item) throw new NotFoundException('Post not found');
    return item;
  }

  async update(id: string, dto: UpdatePostDto) {
    const { categoryId, tags, ...rest } = dto;
    const data: Record<string, unknown> = {
      ...rest,
      ...(categoryId && { categoryId }),
    };
    if (typeof dto.content === 'string' && dto.content.trim().length > 0) {
      const readingWpm = this.configService.get<number>('blog.readingWpm', 200);
      const wordCount = dto.content.trim().split(/\s+/).filter(Boolean).length;
      data.readingTime = Math.max(1, Math.ceil(wordCount / readingWpm));
    }
    return this.prismaWrite.blogPost.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string) {
    return this.prismaWrite.blogPost.update({
      where: { id },
      data: {
        status: PostStatus.ARCHIVED,
        deletedAt: new Date(),
        featured: false,
      },
    });
  }
}
