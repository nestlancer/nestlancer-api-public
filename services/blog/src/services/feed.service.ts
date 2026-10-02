import { Injectable, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '@nestlancer/cache';
import { PostStatus } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';

export type FeedPost = {
  title: string;
  slug: string;
  excerpt: string | null;
  content?: string | null;
  publishedAt: Date | null;
  updatedAt: Date;
  author?: { firstName: string | null; lastName: string | null } | null;
};

const FEED_CACHE_TTL_SECONDS = 300;

/**
 * Builds RSS 2.0 and Atom 1.0 syndication feeds from published blog posts.
 */
@Injectable()
export class FeedService {
  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly config: ConfigService,
    @Optional() private readonly cache?: CacheService,
  ) {}

  async generateRss(): Promise<string> {
    const cached = await this.readFeedCache('rss');
    if (cached) return cached;
    const { posts, siteUrl, feedUrl, title, description } = await this.loadFeedContext('rss');
    const items = posts
      .map((post) => {
        const link = `${siteUrl}/blog/${this.escapeXml(post.slug)}`;
        const pubDate = (post.publishedAt ?? post.updatedAt).toUTCString();
        const summary = this.escapeXml(this.summaryOf(post));
        const author = this.authorName(post);
        return [
          '    <item>',
          `      <title>${this.escapeXml(post.title)}</title>`,
          `      <link>${link}</link>`,
          `      <guid isPermaLink="true">${link}</guid>`,
          `      <pubDate>${pubDate}</pubDate>`,
          author ? `      <author>${this.escapeXml(author)}</author>` : null,
          `      <description>${summary}</description>`,
          '    </item>',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0">',
      '  <channel>',
      `    <title>${this.escapeXml(title)}</title>`,
      `    <link>${this.escapeXml(siteUrl)}</link>`,
      `    <description>${this.escapeXml(description)}</description>`,
      `    <atom:link xmlns:atom="http://www.w3.org/2005/Atom" href="${this.escapeXml(feedUrl)}" rel="self" type="application/rss+xml"/>`,
      items,
      '  </channel>',
      '</rss>',
      '',
    ].join('\n');
    await this.writeFeedCache('rss', xml);
    return xml;
  }

  async generateAtom(): Promise<string> {
    const cached = await this.readFeedCache('atom');
    if (cached) return cached;
    const { posts, siteUrl, feedUrl, title, description } = await this.loadFeedContext('atom');
    const updated = (posts[0]?.publishedAt ?? posts[0]?.updatedAt ?? new Date()).toISOString();
    const entries = posts
      .map((post) => {
        const link = `${siteUrl}/blog/${this.escapeXml(post.slug)}`;
        const published = (post.publishedAt ?? post.updatedAt).toISOString();
        const modified = post.updatedAt.toISOString();
        const summary = this.escapeXml(this.summaryOf(post));
        const author = this.authorName(post);
        return [
          '  <entry>',
          `    <title>${this.escapeXml(post.title)}</title>`,
          `    <link href="${link}" rel="alternate" type="text/html"/>`,
          `    <id>${link}</id>`,
          `    <published>${published}</published>`,
          `    <updated>${modified}</updated>`,
          author
            ? `    <author><name>${this.escapeXml(author)}</name></author>`
            : null,
          `    <summary type="text">${summary}</summary>`,
          '  </entry>',
        ]
          .filter(Boolean)
          .join('\n');
      })
      .join('\n');

    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      `<feed xmlns="http://www.w3.org/2005/Atom">`,
      `  <title>${this.escapeXml(title)}</title>`,
      `  <subtitle>${this.escapeXml(description)}</subtitle>`,
      `  <link href="${this.escapeXml(feedUrl)}" rel="self" type="application/atom+xml"/>`,
      `  <link href="${this.escapeXml(siteUrl)}" rel="alternate" type="text/html"/>`,
      `  <id>${this.escapeXml(feedUrl)}</id>`,
      `  <updated>${updated}</updated>`,
      entries,
      '</feed>',
      '',
    ].join('\n');
    await this.writeFeedCache('atom', xml);
    return xml;
  }

  private async loadFeedContext(kind: 'rss' | 'atom') {
    const limit = this.config.get<number>('blog.rssItemsCount') ?? 20;
    const siteUrl = this.resolvePublicWebUrl();
    const apiBase = this.resolvePublicApiUrl();
    const feedUrl = `${apiBase}/api/v1/blog/feed/${kind}`;
    const title = 'Nestlancer Blog';
    const description = 'Engineering, delivery, and product insights from Nestlancer.';

    // Excerpt only — pulling full markdown `content` made RSS generation stall
    // under load (gateway 15s 504 on /blog/feed/rss).
    const posts = (await this.prismaRead.blogPost.findMany({
      where: { status: PostStatus.PUBLISHED, deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: limit,
      select: {
        title: true,
        slug: true,
        excerpt: true,
        publishedAt: true,
        updatedAt: true,
        author: { select: { firstName: true, lastName: true } },
      },
    })) as FeedPost[];

    return { posts, siteUrl, feedUrl, title, description };
  }

  private async readFeedCache(kind: 'rss' | 'atom'): Promise<string | null> {
    if (!this.cache) return null;
    try {
      const cached = await this.cache.get<string>(`blog:feed:${kind}`);
      return typeof cached === 'string' && cached ? cached : null;
    } catch {
      return null;
    }
  }

  private async writeFeedCache(kind: 'rss' | 'atom', xml: string): Promise<void> {
    if (!this.cache) return;
    try {
      await this.cache.set(`blog:feed:${kind}`, xml, FEED_CACHE_TTL_SECONDS);
    } catch {
      // Feed generation already succeeded; cache is best-effort.
    }
  }

  /** Prefer public web origin; ignore docker-internal FRONTEND_URL (localhost/127.0.0.1). */
  private resolvePublicWebUrl(): string {
    const candidates = [
      this.config.get<string>('PUBLIC_WEB_URL'),
      this.config.get<string>('WEB_APP_URL'),
      process.env.PUBLIC_WEB_URL,
      process.env.WEB_APP_URL,
      process.env.NEXT_PUBLIC_WEB_URL,
      this.config.get<string>('FRONTEND_URL'),
      process.env.FRONTEND_URL,
    ];
    for (const raw of candidates) {
      const value = raw?.trim().replace(/\/$/, '');
      if (!value) continue;
      if (/localhost|127\.0\.0\.1/i.test(value)) continue;
      return value;
    }
    return 'https://app.nestlancer.com';
  }

  private resolvePublicApiUrl(): string {
    const candidates = [
      this.config.get<string>('PUBLIC_API_URL'),
      process.env.PUBLIC_API_URL,
      process.env.NEXT_PUBLIC_API_URL,
      process.env.GATEWAY_PUBLIC_URL,
    ];
    for (const raw of candidates) {
      const value = raw?.trim().replace(/\/$/, '');
      if (!value) continue;
      if (/localhost|127\.0\.0\.1/i.test(value)) continue;
      return value;
    }
    return 'https://api.nestlancer.com';
  }

  private summaryOf(post: FeedPost): string {
    const raw = (post.excerpt || post.content || '').replace(/\s+/g, ' ').trim();
    if (!raw) return post.title;
    return raw.length > 280 ? `${raw.slice(0, 277)}...` : raw;
  }

  private authorName(post: FeedPost): string | null {
    const first = post.author?.firstName?.trim() || '';
    const last = post.author?.lastName?.trim() || '';
    const name = `${first} ${last}`.trim();
    return name || null;
  }

  private escapeXml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
