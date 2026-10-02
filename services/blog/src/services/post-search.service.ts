import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaReadService, ReadOnly } from '@nestlancer/database';
import { SearchPostsDto } from '../dto/search-posts.dto';
import { PostFeaturedImageService } from './post-featured-image.service';

function sanitizeSearchQuery(raw: string | undefined): string {
  if (typeof raw !== 'string' || /[\u0000-\u001F\u007F]/.test(raw)) {
    throw new BadRequestException('q must not contain control characters');
  }
  const q = raw.trim();
  if (q.length < 2) {
    throw new BadRequestException('q must be longer than or equal to 2 characters');
  }
  return q;
}

@Injectable()
export class PostSearchService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly featuredImageService: PostFeaturedImageService,
  ) {}

  @ReadOnly()
  async search(dto: SearchPostsDto) {
    const q = sanitizeSearchQuery(dto.q);
    const items = await this.prismaRead.blogPost.findMany({
      where: {
        status: 'PUBLISHED',
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { excerpt: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 20,
    });
    return this.featuredImageService.enrichPosts(items);
  }
}
