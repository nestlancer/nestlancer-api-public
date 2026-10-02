import { ContentFormat } from '../dto/create-post.dto';
import { PostStatus } from '@nestlancer/common';

export { PostStatus };

export class Post {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentFormat: ContentFormat;
  featuredImageId?: string;
  categoryId?: string;
  authorId?: string;
  seo?: any;
  readingTime: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  commentsEnabled: boolean;
  status: PostStatus;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
