import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaReadService } from '@nestlancer/database';

interface AuthorResponse {
  id: string;
  name: string;
  email: string;
  postCount: number;
}

@Injectable()
export class AuthorsService {
  constructor(private readonly prismaRead: PrismaReadService) {}

  async findAll(): Promise<AuthorResponse[]> {
    const authors = await this.prismaRead.user.findMany({
      where: {
        blogPosts: {
          some: {},
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: { blogPosts: true },
        },
      },
      orderBy: {
        blogPosts: {
          _count: 'desc',
        },
      },
    });

    return authors.map((author) => ({
      id: author.id,
      name: `${author.firstName} ${author.lastName}`,
      email: author.email,
      postCount: author._count?.blogPosts || 0,
    }));
  }

  async findById(id: string): Promise<AuthorResponse> {
    const author = await this.prismaRead.user.findUnique({
      where: { id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        _count: {
          select: { blogPosts: true },
        },
      },
    });

    if (!author) {
      throw new NotFoundException(`Author with ID "${id}" not found`);
    }

    return {
      id: author.id,
      name: `${author.firstName} ${author.lastName}`,
      email: author.email,
      postCount: author._count?.blogPosts || 0,
    };
  }
}
