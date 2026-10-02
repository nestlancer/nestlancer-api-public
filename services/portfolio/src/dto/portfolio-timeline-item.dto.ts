import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Slim payload for public portfolio timeline (title + date only). */
export class PortfolioTimelineItemDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Brand identity — Acme Co.' })
  title: string;

  @ApiProperty({ example: 'brand-identity-acme' })
  slug: string;

  @ApiPropertyOptional({ example: '2024-03-08T12:00:00.000Z' })
  publishedAt?: Date | null;

  @ApiPropertyOptional({ example: '2024-02-15T12:00:00.000Z' })
  completedAt?: Date | null;

  @ApiProperty({ example: '2024-01-10T12:00:00.000Z' })
  createdAt: Date;
}
