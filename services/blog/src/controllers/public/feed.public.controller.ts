import { Controller, Get, Res } from '@nestjs/common';
import { ApiStandardResponses, Public } from '@nestlancer/common';
import { FeedService } from '../../services/feed.service';

import { ApiTags, ApiOperation } from '@nestjs/swagger';

const FEED_CACHE_CONTROL = 'public, max-age=60, s-maxage=300, stale-while-revalidate=600';

/**
 * Controller for public RSS and Atom feeds.
 * Provides endpoints for generating syndication feeds of blog content.
 *
 * Uses @Res() so TransformResponseInterceptor does not JSON-envelope XML.
 * @Cacheable is intentionally not used here — with @Res() a Redis hit would
 * skip the handler and never call res.send(), hanging the gateway (15s 504).
 *
 * @category Blog
 */
@ApiTags('Blog - Public Feeds')
@Controller('feed')
@ApiStandardResponses()
export class FeedPublicController {
  constructor(private readonly feedService: FeedService) {}

  /**
   * Generates a structural RSS 2.0 feed representing the latest published blog posts.
   *
   * @returns A promise resolving to a valid XML RSS feed response
   */
  @Public()
  @Get('rss')
  @ApiOperation({
    summary: 'Get global RSS feed',
    description: 'Retrieve the latest published blog posts in standard RSS 2.0 format.',
  })
  async getRss(@Res() res: any): Promise<any> {
    const feed = await this.feedService.generateRss();
    res.header('Content-Type', 'application/rss+xml');
    res.header('Cache-Control', FEED_CACHE_CONTROL);
    res.send(feed);
  }

  /**
   * Generates a structural Atom 1.0 feed representing the latest published blog posts.
   *
   * @returns A promise resolving to a valid XML Atom feed response
   */
  @Public()
  @Get('atom')
  @ApiOperation({
    summary: 'Get global Atom feed',
    description: 'Retrieve the latest published blog posts in standard Atom format.',
  })
  async getAtom(@Res() res: any): Promise<any> {
    const feed = await this.feedService.generateAtom();
    res.header('Content-Type', 'application/atom+xml');
    res.header('Cache-Control', FEED_CACHE_CONTROL);
    res.send(feed);
  }
}
