import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PostStatus } from '@nestlancer/common';
import { PrismaReadService } from '@nestlancer/database';
import { FeedService } from '../../../src/services/feed.service';

describe('FeedService', () => {
  let service: FeedService;
  const findMany = jest.fn();

  beforeEach(async () => {
    findMany.mockReset();
    findMany.mockResolvedValue([
      {
        title: 'Hello & World',
        slug: 'hello-world',
        excerpt: 'An <excerpt> about APIs',
        content: null,
        publishedAt: new Date('2026-01-15T12:00:00.000Z'),
        updatedAt: new Date('2026-01-16T12:00:00.000Z'),
        author: { firstName: 'Ada', lastName: 'Lovelace' },
      },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: PrismaReadService,
          useValue: { blogPost: { findMany } },
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'blog.rssItemsCount') return 20;
              if (key === 'FRONTEND_URL') return 'https://web.example.com';
              if (key === 'PUBLIC_API_URL') return 'https://api.example.com';
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateRss', () => {
    it('should generate RSS feed with published posts', async () => {
      const result = await service.generateRss();
      expect(findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: PostStatus.PUBLISHED, deletedAt: null },
          take: 20,
        }),
      );
      expect(findMany.mock.calls[0][0].select.content).toBeUndefined();
      expect(result).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(result).toContain('<rss version="2.0">');
      expect(result).toContain('<title>Hello &amp; World</title>');
      expect(result).toContain('https://web.example.com/blog/hello-world');
      expect(result).toContain('An &lt;excerpt&gt; about APIs');
      expect(result).toContain('<author>Ada Lovelace</author>');
    });
  });

  describe('generateAtom', () => {
    it('should generate Atom feed with published posts', async () => {
      const result = await service.generateAtom();
      expect(result).toContain('<feed xmlns="http://www.w3.org/2005/Atom">');
      expect(result).toContain('<title>Hello &amp; World</title>');
      expect(result).toContain('rel="self" type="application/atom+xml"');
      expect(result).toContain('<summary type="text">An &lt;excerpt&gt; about APIs</summary>');
    });
  });
});
