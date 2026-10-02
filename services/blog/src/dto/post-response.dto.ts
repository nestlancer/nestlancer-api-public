export class PostResponseDto {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  contentFormat: string;
  featuredImage?: any;
  category?: any;
  tags?: any[];
  author?: any;
  seo?: any;
  readingTime: number;
  likeCount: number;
  commentCount: number;
  viewCount: number;
  commentsEnabled: boolean;
  status: string;
  publishedAt?: Date;
  scheduledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
