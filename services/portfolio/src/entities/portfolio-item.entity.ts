import {
  ClientDto,
  ContentFormat,
  LinksDto,
  ProjectDetailsDto,
  SeoDto,
} from '../dto/create-portfolio-item.dto';

import { PortfolioStatus } from '@nestlancer/common';

export { PortfolioStatus };

export class PortfolioItem {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  fullDescription: string;
  contentFormat: ContentFormat;
  categoryId?: string;
  thumbnailId?: string;
  videoUrl?: string;
  client?: ClientDto;
  projectDetails?: ProjectDetailsDto;
  links?: LinksDto;
  seo?: SeoDto;
  status: PortfolioStatus;
  featured: boolean;
  order: number;
  likeCount: number;
  viewCount: number;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
