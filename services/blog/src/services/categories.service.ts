import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import type { Pool } from 'pg';
import { PrismaReadService, PrismaWriteService, createPgPool } from '@nestlancer/database';

interface CategoryResponse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: Date;
}

@Injectable()
export class CategoriesService implements OnModuleInit {
  private listPool: Pool | null = null;

  constructor(
    private readonly prismaRead: PrismaReadService,
    private readonly prismaWrite: PrismaWriteService,
  ) {}

  private readPool(): Pool {
    if (!this.listPool) {
      const connectionString = process.env.DATABASE_READ_URL || process.env.DATABASE_URL;
      if (!connectionString) {
        throw new Error('DATABASE_URL or DATABASE_READ_URL must be set');
      }
      this.listPool = createPgPool(connectionString, { max: 2 });
    }
    return this.listPool;
  }

  async onModuleInit(): Promise<void> {
    if (!process.env.DATABASE_READ_URL && !process.env.DATABASE_URL) return;
    await this.readPool().query('SELECT 1');
  }

  async findAll(): Promise<CategoryResponse[]> {
    const result = await this.readPool().query(
      `SELECT c.id, c.name, c.slug, c.description, c."createdAt",
              COUNT(p.id)::int AS "postCount"
       FROM "BlogCategory" c
       LEFT JOIN "BlogPost" p ON p."categoryId" = c.id
       GROUP BY c.id
       ORDER BY c.name ASC`,
    );
    return result.rows.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      description: cat.description || undefined,
      postCount: Number(cat.postCount ?? 0),
      createdAt: cat.createdAt,
    }));
  }

  async findBySlug(slug: string): Promise<CategoryResponse> {
    const category = await this.prismaRead.blogCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    if (!category) {
      throw new NotFoundException(`Category with slug "${slug}" not found`);
    }

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      postCount: category._count.posts,
      createdAt: category.createdAt,
    };
  }

  async create(data: {
    name: string;
    slug: string;
    description?: string;
  }): Promise<CategoryResponse> {
    const category = await this.prismaWrite.blogCategory.upsert({
      where: { slug: data.slug },
      create: {
        name: data.name,
        slug: data.slug,
        description: data.description,
      },
      update: {
        name: data.name,
        description: data.description,
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      postCount: category._count.posts,
      createdAt: category.createdAt,
    };
  }

  async update(
    id: string,
    data: { name?: string; slug?: string; description?: string },
  ): Promise<CategoryResponse> {
    const existing = await this.prismaRead.blogCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    const category = await this.prismaWrite.blogCategory.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.slug !== undefined ? { slug: data.slug } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
      },
      include: {
        _count: {
          select: { posts: true },
        },
      },
    });

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description || undefined,
      postCount: category._count.posts,
      createdAt: category.createdAt,
    };
  }

  async remove(id: string): Promise<{ deleted: true; id: string }> {
    const existing = await this.prismaRead.blogCategory.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Category with id "${id}" not found`);
    }

    await this.prismaWrite.blogCategory.delete({ where: { id } });
    return { deleted: true, id };
  }
}
