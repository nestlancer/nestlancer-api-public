import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

import { Request, Response } from 'express';

import { ApiStandardResponses, Public } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Blog Gateway Controller
 * Routes blog requests to the Blog Service.
 *
 * Blog service: prefix api + URI v1
 * Controllers: @Controller('posts'), @Controller('categories'),
 *              @Controller('tags'), @Controller('authors'), @Controller('feed'),
 *              @Controller('posts/:slug/comments'), @Controller('posts/:slug'),
 *              @Controller('bookmarks')
 *
 * The gateway controller is @Controller('blog'), but the blog service uses
 * 'posts', 'categories', etc. as controller names (no 'blog' prefix).
 * The extractServicePath strips 'blog' from the path, so:
 * Gateway: /api/v1/blog/posts/hello → Service: /api/v1/posts/hello
 */
@Controller('blog')
@ApiTags('blog')
@ApiStandardResponses()
export class BlogController {
  constructor(private readonly proxy: HttpProxyService) {}

  // --- Posts (maps to @Controller('posts')) ---

  @Public()
  @Get('posts')
  @ApiOperation({ summary: 'List published blog posts' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryId', required: false, type: String })
  async listPosts(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('posts/search')
  @ApiOperation({ summary: 'Search blog posts' })
  @ApiQuery({ name: 'q', required: false, type: String })
  async searchPosts(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('posts/health')
  @ApiOperation({ summary: 'Blog service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('posts/:slug')
  @ApiOperation({ summary: 'Get blog post by slug' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async getPostDetail(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('posts/:slug/related')
  @ApiOperation({ summary: 'Get related posts' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async getRelatedPosts(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('posts/:slug/engagement')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get post engagement for current user' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async getPostEngagement(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Post('posts/:slug/view')
  @ApiOperation({ summary: 'Record post view' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async recordView(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('posts/:slug/comments')
  @ApiOperation({ summary: 'Get post public comments' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async getPostComments(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  // --- Authenticated post interactions ---

  @Post('posts/:slug/comments')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a comment to a post' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async addComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Put('posts/:slug/comments/:commentId')
  @Patch('posts/:slug/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a comment on a post' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  async updateComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Delete('posts/:slug/comments/:commentId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a comment on a post' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  @ApiParam({ name: 'commentId', description: 'Comment UUID' })
  async deleteComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:slug/like')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Like a post' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async likePost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:slug/bookmark')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bookmark a post' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async bookmarkPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Delete('posts/:slug/bookmark')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove bookmark from a post' })
  @ApiParam({ name: 'slug', description: 'Post URL slug' })
  async unbookmarkPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  // --- Categories (maps to @Controller('categories')) ---

  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'List blog categories' })
  async listCategories(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('categories/:idOrSlug')
  @ApiOperation({ summary: 'Get category details' })
  @ApiParam({ name: 'idOrSlug', description: 'Category UUID or slug' })
  async getCategoryDetail(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  // --- Tags (maps to @Controller('tags')) ---

  @Public()
  @Get('tags')
  @ApiOperation({ summary: 'List blog tags' })
  async listTags(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('tags/:idOrSlug')
  @ApiOperation({ summary: 'Get tag details' })
  @ApiParam({ name: 'idOrSlug', description: 'Tag UUID or slug' })
  async getTagDetail(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  // --- Authors (maps to @Controller('authors')) ---

  @Public()
  @Get('authors')
  @ApiOperation({ summary: 'List blog authors' })
  async listAuthors(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Public()
  @Get('authors/:id')
  @ApiOperation({ summary: 'Get author profile' })
  @ApiParam({ name: 'id', description: 'Author UUID' })
  async getAuthorProfile(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  // --- Feed (maps to @Controller('feed')) ---
  // Stream raw XML so TransformResponseInterceptor does not JSON-envelope the body.

  @Public()
  @Get('feed/rss')
  @ApiOperation({ summary: 'Get RSS feed' })
  async getRssFeed(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('blog', req, res);
  }

  @Public()
  @Get('feed/atom')
  @ApiOperation({ summary: 'Get Atom feed' })
  async getAtomFeed(@Req() req: Request, @Res() res: Response) {
    return this.proxy.forward('blog', req, res);
  }

  // --- Bookmarks (maps to @Controller('bookmarks')) ---

  @Get('bookmarks')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List bookmarked posts' })
  async listBookmarks(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }
}
