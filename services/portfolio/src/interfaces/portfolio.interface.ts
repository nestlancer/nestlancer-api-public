import { PortfolioItem } from '../entities/portfolio-item.entity';
import { PortfolioCategory } from '../entities/portfolio-category.entity';
import { PortfolioTag } from '../entities/portfolio-tag.entity';
import { PortfolioImage } from '../entities/portfolio-image.entity';

export interface PortfolioItemWithRelations extends PortfolioItem {
  category?: PortfolioCategory;
  tags?: PortfolioTag[];
  images?: PortfolioImage[];
}

export interface PortfolioSearchResult {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnailId?: string;
  rank: number;
  highlights?: Record<string, string[]>;
}
