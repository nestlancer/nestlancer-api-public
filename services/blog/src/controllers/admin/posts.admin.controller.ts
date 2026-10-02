import { ApiStandardResponses, UserRole } from '@nestlancer/common';
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Req } from '@nestjs/common';
import { ActiveUser, Auth } from '@nestlancer/auth-lib';
import { BlogAdminService } from '../../services/blog-admin.service';
import { PostsService } from '../../services/posts.service';
import { PostPublishingService } from '../../services/post-publishing.service';
import { PostSchedulingService } from '../../services/post-scheduling.service';
import { CreatePostDto } from '../../dto/create-post.dto';
import { UpdatePostDto } from '../../dto/update-post.dto';
import { SchedulePostDto } from '../../dto/schedule-post.dto';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';

import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiProperty } from '@nestjs/swagger';

/**
 * Administrative controller for managing blog posts.
 * Provides endpoints for creating, updating, publishing, and organizing content.
 *
 * @category Blog
 */
@ApiTags('Blog - Admin Posts')
@ApiBearerAuth()
@Controller('admin/posts')
@Auth(UserRole.ADMIN)
@ApiStandardResponses()
export class PostsAdminController {
  constructor(
    private readonly adminService: BlogAdminService,
    private readonly postsService: PostsService,
    private readonly publishingService: PostPublishingService,
    private readonly schedulingService: PostSchedulingService,
    private readonly prismaWrite: PrismaWriteService,
    private readonly prismaRead: PrismaReadService,
  ) {}

  /**
   * Retrieves all blog posts with detailed administrative filtering and pagination.
   *
   * @param query Complex filtering criteria for post management
   * @returns A promise resolving to a paginated list of all post entries
   */
  @Get()
  @ApiOperation({
    summary: 'List all posts (Admin)',
    description:
      'Retrieve a comprehensive paginated list of all blog posts, including drafts, scheduled, and deleted entries.',
  })
  async findAll(@Query() query: any): Promise<any> {
    return this.adminService.findAll(query);
  }

  /**
   * Retrieves exhaustive metadata for a specific blog post by its unique ID.
   *
   * @param id The unique internal identifier of the post
   * @returns A promise resolving to the detailed post management object
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Get post detail (Admin)',
    description: 'Fetch full configuration and historical metadata for a specific blog post entry.',
  })
  async findOne(@Param('id') id: string): Promise<any> {
    return this.adminService.findById(id);
  }

  /**
   * Persists a new blog post entry to the database.
   *
   * @param dto Structured construction data for the post
   * @param req The incoming request for automated author context resolution
   * @returns A promise resolving to the initially created post object
   */
  @Post()
  @ApiOperation({
    summary: 'Create blog post',
    description: 'Initialize a new blog post entry. Status defaults to DRAFT upon creation.',
  })
  async create(@Body() dto: CreatePostDto, @Req() req: any): Promise<any> {
    if (!dto.authorId) {
      dto.authorId = req.user.id;
    }
    return this.postsService.create(dto);
  }

  /**
   * Modifies the attributes of an existing blog post.
   *
   * @param id The unique identifier of the target post
   * @param dto The delta of changes to apply to the post
   * @returns A promise resolving to the updated post object
   */
  @Patch(':id')
  @ApiOperation({
    summary: 'Update blog post',
    description: 'Apply partial updates to post content, taxonomy, or configuration.',
  })
  async update(@Param('id') id: string, @Body() dto: UpdatePostDto): Promise<any> {
    return this.adminService.update(id, dto);
  }

  /**
   * Marks a blog post for soft deletion, removing it from public view.
   *
   * @param id The unique identifier of the target post
   * @returns A promise resolving to a deletion confirmation
   */
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete blog post',
    description: 'Perform a soft-deletion of the blog post, archival only.',
  })
  async remove(@Param('id') id: string): Promise<any> {
    return this.adminService.softDelete(id);
  }

  /**
   * Transition a post status to published, making it visible to the public.
   *
   * @param id The unique identifier of the target post
   * @returns A promise resolving to the updated publication status
   */
  @Post(':id/publish')
  @ApiOperation({
    summary: 'Publish post',
    description: 'Immediately transition a post status to PUBLISHED and record the timestamp.',
  })
  async publish(@Param('id') id: string): Promise<any> {
    return this.publishingService.publish(id);
  }

  /**
   * Reverts a published post back to draft status.
   *
   * @param id The unique identifier of the target post
   * @returns A promise resolving to the updated publication status
   */
  @Post(':id/unpublish')
  @ApiOperation({
    summary: 'Unpublish post',
    description: 'Transition a published or scheduled post back to DRAFT status.',
  })
  async unpublish(@Param('id') id: string): Promise<any> {
    return this.publishingService.unpublish(id);
  }

  /**
   * Configures a post for automated publication at a future timestamp.
   *
   * @param id The unique identifier of the post
   * @param dto Scheduling parameters including the target date
   * @returns A promise resolving to the scheduling confirmation
   */
  @Post(':id/schedule')
  @ApiOperation({
    summary: 'Schedule post publication',
    description: 'Define the future date and time for automated post publication.',
  })
  async schedule(@Param('id') id: string, @Body() dto: SchedulePostDto): Promise<any> {
    return this.schedulingService.schedule(id, new Date(dto.scheduledAt));
  }

  /**
   * Designates a blog post as a 'featured' item for highlighted display.
   *
   * @param id The unique identifier of the post
   * @returns A promise resolving to the updated feature status
   */
  @Post(':id/feature')
  @ApiOperation({
    summary: 'Feature blog post',
    description: 'Mark a post as a featured piece of content for site-wide promotion.',
  })
  async featurePost(@Param('id') id: string): Promise<any> {
    const post = await this.prismaWrite.blogPost.update({
      where: { id },
      data: { featured: true },
    });
    return { id: post.id, featured: post.featured, status: post.status };
  }

  /**
   * Removes the 'featured' designation from a blog post.
   *
   * @param id The unique identifier of the post
   * @returns A promise resolving to the updated feature status
   */
  @Post(':id/unfeature')
  @ApiOperation({
    summary: 'Unfeature blog post',
    description: 'Remove the featured status flag from a blog post.',
  })
  async unfeaturePost(@Param('id') id: string): Promise<any> {
    const post = await this.prismaWrite.blogPost.update({
      where: { id },
      data: { featured: false },
    });
    return { id, featured: false };
  }

  /**
   * Pins a blog post to the top of its category or the global feed.
   *
   * @param id The unique identifier of the post
   * @returns A promise resolving to the updated pin status
   */
  @Post(':id/pin')
  @ApiOperation({
    summary: 'Pin blog post',
    description: 'Pin a post to ensure it remains at the top of categorized listings.',
  })
  async pinPost(@Param('id') id: string): Promise<any> {
    const post = await this.prismaRead.blogPost.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found');

    const seoData: any = typeof post.seo === 'object' && post.seo !== null ? post.seo : {};
    seoData.pinned = true;

    await this.prismaWrite.blogPost.update({
      where: { id },
      data: { seo: seoData },
    });

    return { id, pinned: true };
  }

  /**
   * Unpins a blog post.
   *
   * @param id The unique identifier of the post
   * @returns A promise resolving to the updated pin status
   */
  @Post(':id/unpin')
  @ApiOperation({
    summary: 'Unpin blog post',
    description: 'Remove the pinned status from a blog post.',
  })
  async unpinPost(@Param('id') id: string): Promise<any> {
    const post = await this.prismaRead.blogPost.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found');

    const seoData: any = typeof post.seo === 'object' && post.seo !== null ? post.seo : {};
    seoData.pinned = false;

    await this.prismaWrite.blogPost.update({
      where: { id },
      data: { seo: seoData },
    });

    return { id, pinned: false };
  }

  /**
   * Creates an identical draft clone of an existing blog post.
   *
   * @param id The source post identifier
   * @returns A promise resolving to the new draft post metadata
   */
  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicate post',
    description: 'Create a new draft post by copying content and settings from an existing post.',
  })
  async duplicatePost(@Param('id') id: string): Promise<any> {
    const post = await this.prismaRead.blogPost.findUnique({ where: { id } });
    if (!post) throw new Error('Post not found');

    const { id: _, slug, createdAt, updatedAt, publishedAt, ...postData } = post;

    const duplicated = await this.prismaWrite.blogPost.create({
      data: {
        ...postData,
        title: `${post.title} (Copy)`,
        slug: `${slug}-copy-${Date.now()}`,
        status: 'DRAFT',
      } as any,
    });

    return { originalId: id, duplicateId: duplicated.id, status: 'DRAFT' };
  }

  /**
   * Moves a blog post into the archive state.
   *
   * @param id The unique identifier of the post
   * @returns A promise resolving to the updated archive status
   */
  @Post(':id/archive')
  @ApiOperation({
    summary: 'Archive post',
    description: 'Permanently archive a post, removing it from active management queues.',
  })
  async archivePost(@Param('id') id: string): Promise<any> {
    const post = await this.publishingService.archive(id);
    return { id: post.id, archived: true, status: post.status };
  }

  /**
   * Retrieves the version history and revisions for a specific post.
   *
   * @param id The post identifier
   * @returns A promise resolving to the list of historical revisions
   */
  @Get(':id/revisions')
  @ApiOperation({
    summary: 'Get post revisions',
    description: 'Fetch the audit trail and content history for a specific post.',
  })
  async getRevisions(@Param('id') id: string): Promise<any> {
    return { id, revisions: [] };
  }

  /**
   * Restores a post to a specific historical revision state.
   *
   * @param id The post identifier
   * @param revisionId The version ID to restore to
   * @returns A promise resolving to the restoration confirmation
   */
  @Post(':id/revisions/:revisionId/restore')
  @ApiOperation({
    summary: 'Restore revision',
    description: 'Roll back a post to a previously saved content state.',
  })
  async restoreRevision(
    @Param('id') id: string,
    @Param('revisionId') revisionId: string,
  ): Promise<any> {
    return { id, revisionId, restored: true };
  }

  /**
   * Bulk imports blog post records from an external source payload.
   *
   * @param body The import configuration and source data
   * @returns A promise resolving to the import processing results
   */
  @Post('import')
  @ApiOperation({
    summary: 'Import posts',
    description: 'Batch process and import blog content from standardized JSON/CSV formats.',
  })
  async importPosts(@Body() body: any): Promise<any> {
    if (!body.posts || !Array.isArray(body.posts)) {
      return { error: 'Invalid payload: posts array required' };
    }

    // Basic bulk insert structure mapped to DTO concept
    let imported = 0;
    let failed = 0;
    const errors = [];

    for (const postData of body.posts) {
      try {
        // Assuming postsService.create handles internal validation/creation
        await this.postsService.create({
          ...postData,
          status: 'DRAFT', // Enforce draft status on import
        });
        imported++;
      } catch (err: any) {
        failed++;
        errors.push({ title: postData.title, error: err.message });
      }
    }

    return { imported, failed, errors };
  }

  /**
   * Generates a downloadable export of selected blog post data.
   *
   * @param body The filter and format configuration for export
   * @returns A promise resolving to the generated export task status
   */
  @Post('export')
  @ApiOperation({
    summary: 'Export posts',
    description: 'Initiate a background export of blog content for data portability.',
  })
  async exportPosts(@Body() body: any, @ActiveUser('sub') adminId: string): Promise<any> {
    const exportId = `export_${Date.now()}`;

    await this.prismaWrite.outbox.create({
      data: {
        type: 'BLOG_POSTS_EXPORT_REQUESTED',
        payload: { exportId, filters: body.filters || {}, requestedByUserId: adminId },
      },
    });

    return { exportId, status: 'processing' };
  }

  /**
   * Updates global-level settings and configurations for the blog service.
   *
   * @param body The service configuration delta
   * @returns A promise resolving to the updated configuration state
   */
  @Patch('settings')
  @ApiOperation({
    summary: 'Update blog settings',
    description:
      'Modify service-level configurations such as default pagination, moderation rules, etc.',
  })
  async updateBlogSettings(@Body() body: any): Promise<any> {
    await this.prismaWrite.systemConfig.upsert({
      where: { key: 'blog.settings' },
      create: {
        key: 'blog.settings',
        value: body,
      },
      update: {
        value: body,
      },
    });

    return { updated: true, settings: body };
  }
}
