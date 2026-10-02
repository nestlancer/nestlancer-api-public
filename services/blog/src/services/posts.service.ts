import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Pool } from 'pg';
import { PrismaWriteService, PrismaReadService, ReadOnly, createPgPool } from '@nestlancer/database';
import { ContentFormat, CreatePostDto } from '../dto/create-post.dto';
import { UpdatePostDto } from '../dto/update-post.dto';
import { QueryPostsDto } from '../dto/query-posts.dto';
import { PostStatus } from '@nestlancer/common';
import { ConfigService } from '@nestjs/config';
import { PostFeaturedImageService } from './post-featured-image.service';

@Injectable()
export class PostsService implements OnModuleInit {
  /** Direct read pool for the public list. Prisma's engine spent ~500ms on this
   * query while the same SQL through `pg` returns in ~30ms. */
  private listPool: Pool | null = null;

  constructor(
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
    private readonly configService: ConfigService,
    private readonly featuredImageService: PostFeaturedImageService,
  ) {}

  private readListPool(): Pool {
    if (!this.listPool) {
      const connectionString = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL or DATABASE_READ_URL must be set');
      }
      // Cap this extra pool at 2. Leave min and idle timeout on the documented
      // contract (DATABASE_POOL_MIN, default 1) so the first request after boot
      // does not open a new TLS connection.
      this.listPool = createPgPool(connectionString, { max: 2 });
    }
    return this.listPool;
  }

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_READ_URL && !process.env.DATABASE_URL) return;
    const pool = this.readListPool();
    // The article page loads the post and related cards together, so two
    // connections have to exist before the first request or the second pays
    // for a TLS handshake.
    await Promise.all([pool.query('SELECT 1'), pool.query('SELECT 1')]);
  }

  /**
   * Creates a new blog post entry in the database.
   * Calculates reading time based on word count and configured WPM.
   *
   * @param dto Data Transfer Object containing post details
   * @returns A promise resolving to the created blog post record
   */
  async create(dto: CreatePostDto): Promise<any> {
    const slug = dto.slug || Math.random().toString(36).substring(2, 15);
    const readingTime = this.estimateReadingMinutes(dto.content);

    const contentFormat = dto.contentFormat ?? ContentFormat.MARKDOWN;
    let categoryId = dto.categoryId;
    if (!categoryId) {
      const defaultCategory = await this.prismaRead.blogCategory.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      if (!defaultCategory) {
        throw new BadRequestException('No blog category configured. Create a category first.');
      }
      categoryId = defaultCategory.id;
    }

    const { tags, ...rest } = dto;

    return this.prismaWrite.blogPost.create({
      data: {
        ...(rest as any),
        contentFormat,
        slug,
        categoryId,
        authorId: rest.authorId as string,
        readingTime,
        status: PostStatus.DRAFT,
        tags: tags
          ? {
              connectOrCreate: tags.map((tag) => {
                const slug = tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                return {
                  where: { slug },
                  create: {
                    name: tag.charAt(0).toUpperCase() + tag.slice(1),
                    slug,
                  },
                };
              }),
            }
          : undefined,
      },
    });
  }

  /**
   * Retrieves a paginated list of published blog posts based on filter criteria.
   *
   * @param query Filtering and pagination parameters
   * @returns A promise resolving to a paginated set of blog posts
   */
  @ReadOnly()
  async findPublished(query: QueryPostsDto): Promise<any> {
    const { page = 1, limit = 10, categoryId, tag, authorId, search } = query;
    const skip = (page - 1) * limit;

    const values: unknown[] = [];
    const clauses = [`p.status = 'PUBLISHED'::"BlogStatus"`];
    const bind = (value: unknown) => {
      values.push(value);
      return `$${values.length}`;
    };
    if (categoryId) clauses.push(`p."categoryId" = ${bind(categoryId)}`);
    if (authorId) clauses.push(`p."authorId" = ${bind(authorId)}`);
    if (tag) {
      clauses.push(`EXISTS (
        SELECT 1 FROM "_BlogPostTags" pt
        JOIN "BlogTag" tg ON tg.id = pt."B"
        WHERE pt."A" = p.id AND tg.name = ${bind(tag.toLowerCase())}
      )`);
    }
    if (search) {
      const pattern = `%${search.replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
      const param = bind(pattern);
      clauses.push(`(p.title ILIKE ${param} ESCAPE '\\' OR p.content ILIKE ${param} ESCAPE '\\')`);
    }
    const whereSql = clauses.join(' AND ');
    const take = Number(limit);
    const limitParam = bind(take);
    const offsetParam = bind(skip);

    // One round trip through `pg`. The card list shows title, excerpt, cover,
    // category, tags, and author — not the article body — so `content` stays
    // in the search filter only.
    const listSql = `
      SELECT
        p.id,
        p.slug,
        p.title,
        p.excerpt,
        p."contentFormat",
        p."authorId",
        p."categoryId",
        p.status,
        p."commentsEnabled",
        p.featured,
        p."featuredImageId",
        p.seo,
        p."readingTime",
        p."viewCount",
        p."likeCount",
        p."scheduledAt",
        p."publishedAt",
        p."deletedAt",
        p."createdAt",
        p."updatedAt",
        CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
          'id', c.id,
          'name', c.name,
          'slug', c.slug,
          'description', c.description,
          'createdAt', c."createdAt",
          'updatedAt', c."updatedAt"
        ) END AS category,
        CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object(
          'id', u.id,
          'firstName', u."firstName",
          'lastName', u."lastName",
          'avatar', u.avatar
        ) END AS author,
        CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object(
          'id', m.id,
          'metadata', m.metadata,
          'urls', m.urls,
          'status', m.status
        ) END AS "featuredMedia",
        COALESCE(
          json_agg(
            json_build_object(
              'id', t.id,
              'name', t.name,
              'slug', t.slug,
              'createdAt', t."createdAt",
              'updatedAt', t."updatedAt"
            )
            ORDER BY t.name
          ) FILTER (WHERE t.id IS NOT NULL),
          '[]'::json
        ) AS tags
      FROM "BlogPost" p
      LEFT JOIN "BlogCategory" c ON c.id = p."categoryId"
      LEFT JOIN "User" u ON u.id = p."authorId"
      LEFT JOIN "_BlogPostTags" pt ON pt."A" = p.id
      LEFT JOIN "BlogTag" t ON t.id = pt."B"
      LEFT JOIN "Media" m ON m.id = p."featuredImageId"
        AND m.status IN ('READY'::"MediaStatus", 'PROCESSING'::"MediaStatus")
        AND m."deletedAt" IS NULL
      WHERE ${whereSql}
      GROUP BY p.id, c.id, u.id, m.id
      ORDER BY p."publishedAt" DESC
      LIMIT ${limitParam} OFFSET ${offsetParam}
    `;
    const countValues = values.slice(0, values.length - 2);
    const countSql = `
      SELECT COUNT(*)::int AS count
      FROM "BlogPost" p
      WHERE ${clauses.join(' AND ')}
    `;

    const pool = this.readListPool();
    const [listResult, countResult] = await Promise.all([
      pool.query(listSql, values),
      pool.query(countSql, countValues),
    ]);
    const items = listResult.rows;
    const totalItems = Number(countResult.rows[0]?.count ?? 0);

    return {
      items: await this.featuredImageService.enrichPosts(items),
      totalItems,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(totalItems / limit),
    };
  }

  /**
   * Retrieves a single blog post by its unique slug.
   *
   * @param slug The unique URL-friendly identifier of the post
   * @throws NotFoundException if the post does not exist
   * @returns A promise resolving to the found blog post
   */
  @ReadOnly()
  async findBySlug(slug: string): Promise<any> {
    const post = await this.prismaRead.blogPost.findFirst({
      where: { slug, deletedAt: null },
      include: { category: true, tags: true },
    });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  /**
   * Retrieves a published blog post by slug (public read).
   * Includes approved commentCount and chronological adjacent posts.
   */
  /**
   * Published id only. View recording must not load the article body.
   */
  @ReadOnly()
  async findPublishedIdBySlug(slug: string): Promise<string | null> {
    const result = await this.readListPool().query(
      `SELECT id FROM "BlogPost"
       WHERE slug = $1 AND status = 'PUBLISHED'::"BlogStatus" AND "deletedAt" IS NULL
       LIMIT 1`,
      [slug],
    );
    return result.rows[0]?.id ?? null;
  }

  /**
   * Approved comments for a public article. One read-pool query (rows + total)
   * so the thread does not wait on a Prisma engine round trip.
   */
  @ReadOnly()
  async findApprovedComments(
    postId: string,
    skip: number,
    take: number,
  ): Promise<{ data: any[]; total: number }> {
    const result = await this.readListPool().query(
      `SELECT
         c.id,
         c."postId",
         c."authorId",
         c.content,
         c."parentId",
         c.status,
         c.likes,
         c."isPinned",
         c."moderationMessage",
         c."createdAt",
         c."updatedAt",
         json_build_object(
           'id', u.id,
           'firstName', u."firstName",
           'lastName', u."lastName",
           'avatar', u.avatar
         ) AS author,
         COUNT(*) OVER()::int AS total
       FROM "BlogComment" c
       JOIN "User" u ON u.id = c."authorId"
       WHERE c."postId" = $1
         AND c.status = 'APPROVED'::"CommentStatus"
       ORDER BY c."createdAt" DESC
       LIMIT $2 OFFSET $3`,
      [postId, take, skip],
    );
    const total = result.rows.length > 0 ? Number(result.rows[0].total) : 0;
    const data = result.rows.map(({ total: _total, ...comment }) => comment);
    return { data, total };
  }

  /**
   * One read-pool round trip for the article the page renders: body, author,
   * category, tags, cover, approved comment count, and previous/next links.
   * Prisma's engine held this handler for ~5s while Postgres logged no statement
   * over 500ms; the same shape through `pg` stays on the list-query path.
   */
  @ReadOnly()
  async findPublishedBySlug(slug: string): Promise<any> {
    const result = await this.readListPool().query(
      `SELECT
        p.id,
        p.slug,
        p.title,
        p.excerpt,
        p.content,
        p."contentFormat",
        p."authorId",
        p."categoryId",
        p.status,
        p."commentsEnabled",
        p.featured,
        p."featuredImageId",
        p.seo,
        p."readingTime",
        p."viewCount",
        p."likeCount",
        p."scheduledAt",
        p."publishedAt",
        p."deletedAt",
        p."createdAt",
        p."updatedAt",
        (SELECT json_build_object(
           'id', c.id, 'name', c.name, 'slug', c.slug, 'description', c.description,
           'createdAt', c."createdAt", 'updatedAt', c."updatedAt"
         ) FROM "BlogCategory" c WHERE c.id = p."categoryId") AS category,
        (SELECT json_build_object(
           'id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'avatar', u.avatar
         ) FROM "User" u WHERE u.id = p."authorId") AS author,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', t.id, 'name', t.name, 'slug', t.slug,
            'createdAt', t."createdAt", 'updatedAt', t."updatedAt"
          ) ORDER BY t.name)
          FROM "_BlogPostTags" pt
          JOIN "BlogTag" t ON t.id = pt."B"
          WHERE pt."A" = p.id
        ), '[]'::json) AS tags,
        (SELECT json_build_object('id', m.id, 'metadata', m.metadata, 'urls', m.urls, 'status', m.status)
         FROM "Media" m
         WHERE m.id = p."featuredImageId"
           AND m.status IN ('READY'::"MediaStatus", 'PROCESSING'::"MediaStatus")
           AND m."deletedAt" IS NULL) AS "featuredMedia",
        (SELECT COUNT(*)::int FROM "BlogComment" cm
         WHERE cm."postId" = p.id AND cm.status = 'APPROVED'::"CommentStatus") AS "commentCount",
        (SELECT json_build_object('id', prev.id, 'title', prev.title, 'slug', prev.slug, 'publishedAt', prev."publishedAt")
         FROM "BlogPost" prev
         WHERE p."publishedAt" IS NOT NULL
           AND prev.status = 'PUBLISHED'::"BlogStatus"
           AND prev."deletedAt" IS NULL
           AND prev.id <> p.id
           AND prev."publishedAt" IS NOT NULL
           AND prev."publishedAt" < p."publishedAt"
         ORDER BY prev."publishedAt" DESC
         LIMIT 1) AS previous,
        (SELECT json_build_object('id', nxt.id, 'title', nxt.title, 'slug', nxt.slug, 'publishedAt', nxt."publishedAt")
         FROM "BlogPost" nxt
         WHERE p."publishedAt" IS NOT NULL
           AND nxt.status = 'PUBLISHED'::"BlogStatus"
           AND nxt."deletedAt" IS NULL
           AND nxt.id <> p.id
           AND nxt."publishedAt" IS NOT NULL
           AND nxt."publishedAt" > p."publishedAt"
         ORDER BY nxt."publishedAt" ASC
         LIMIT 1) AS next
      FROM "BlogPost" p
      WHERE p.slug = $1 AND p.status = 'PUBLISHED'::"BlogStatus" AND p."deletedAt" IS NULL
      LIMIT 1`,
      [slug],
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundException('Post not found');

    const { previous, next, commentCount, ...post } = row;
    const enriched = await this.featuredImageService.enrichPost(post);
    return {
      ...enriched,
      commentCount: Number(commentCount ?? 0),
      adjacent: {
        previous: previous ?? null,
        next: next ?? null,
      },
    };
  }

  /**
   * Related cards for a published post: same category or shared tag, no article body.
   */
  @ReadOnly()
  async findRelatedPublished(slug: string, limit: number): Promise<any[]> {
    const take = Math.min(10, Math.max(1, limit));
    const result = await this.readListPool().query(
      `WITH src AS (
         SELECT id, "categoryId"
         FROM "BlogPost"
         WHERE slug = $1 AND status = 'PUBLISHED'::"BlogStatus" AND "deletedAt" IS NULL
         LIMIT 1
       )
       SELECT
         p.id,
         p.title,
         p.slug,
         p.excerpt,
         p."publishedAt",
         p."readingTime",
         p."featuredImageId",
         p.seo,
         CASE WHEN c.id IS NULL THEN NULL ELSE json_build_object(
           'id', c.id, 'name', c.name, 'slug', c.slug
         ) END AS category,
         CASE WHEN u.id IS NULL THEN NULL ELSE json_build_object(
           'id', u.id, 'firstName', u."firstName", 'lastName', u."lastName", 'avatar', u.avatar
         ) END AS author,
         CASE WHEN m.id IS NULL THEN NULL ELSE json_build_object(
           'id', m.id, 'metadata', m.metadata, 'urls', m.urls, 'status', m.status
         ) END AS "featuredMedia"
       FROM "BlogPost" p
       JOIN src ON true
       LEFT JOIN "BlogCategory" c ON c.id = p."categoryId"
       LEFT JOIN "User" u ON u.id = p."authorId"
       LEFT JOIN "Media" m ON m.id = p."featuredImageId"
         AND m.status IN ('READY'::"MediaStatus", 'PROCESSING'::"MediaStatus")
         AND m."deletedAt" IS NULL
       WHERE p.id <> src.id
         AND p.status = 'PUBLISHED'::"BlogStatus"
         AND p."deletedAt" IS NULL
         AND p."publishedAt" IS NOT NULL
         AND (
           p."categoryId" = src."categoryId"
           OR EXISTS (
             SELECT 1
             FROM "_BlogPostTags" mine
             JOIN "_BlogPostTags" theirs ON theirs."B" = mine."B"
             WHERE mine."A" = src.id AND theirs."A" = p.id
           )
         )
       ORDER BY p."publishedAt" DESC
       LIMIT $2`,
      [slug, take],
    );
    return this.featuredImageService.enrichPosts(result.rows);
  }

  /** Word-count estimate using configured WPM (default 200). */
  estimateReadingMinutes(content: string): number {
    const readingWpm = this.configService.get<number>('blog.readingWpm', 200);
    const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(wordCount / readingWpm));
  }
}
