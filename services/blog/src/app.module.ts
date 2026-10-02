import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor } from '@nestlancer/middleware';
import { ConfigModule } from '@nestjs/config';
import { NestlancerConfigModule } from '@nestlancer/config';
import { DatabaseModule } from '@nestlancer/database';
import { AuthLibModule } from '@nestlancer/auth-lib';
import { LoggerModule } from '@nestlancer/logger';
import { MetricsModule } from '@nestlancer/metrics';
import { TracingModule } from '@nestlancer/tracing';
import { CacheModule } from '@nestlancer/cache';
import { SearchModule } from '@nestlancer/search';
import { OutboxModule } from '@nestlancer/outbox';
import { StorageModule } from '@nestlancer/storage';
import blogConfig from './config/blog.config';
import { PostsPublicController } from './controllers/public/posts.public.controller';
import {
  BlogCategoriesPublicController,
  BlogTagsPublicController,
  AuthorsPublicController,
} from './controllers/public/taxonomy.public.controller';
import { FeedPublicController } from './controllers/public/feed.public.controller';
import {
  BookmarksController,
  PostInteractionsController,
} from './controllers/user/post-interactions.controller';
import {
  CommentsController,
  StandaloneCommentsController,
} from './controllers/user/comments.controller';
import { PostsAdminController } from './controllers/admin/posts.admin.controller';
import { CommentsAdminController } from './controllers/admin/comments.admin.controller';
import {
  BlogCategoriesAdminController,
  BlogTagsAdminController,
  BlogAuthorsAdminController,
} from './controllers/admin/taxonomy.admin.controller';
import { BlogAnalyticsAdminController } from './controllers/admin/blog-analytics.admin.controller';
import { PostsService } from './services/posts.service';
import { PostPublishingService } from './services/post-publishing.service';
import { PostSchedulingService } from './services/post-scheduling.service';
import { PostInteractionsService } from './services/post-interactions.service';
import { PostSearchService } from './services/post-search.service';
import { PostViewsService } from './services/post-views.service';
import { CommentsService } from './services/comments.service';
import { CommentModerationService } from './services/comment-moderation.service';
import { CategoriesService } from './services/categories.service';
import { TagsService } from './services/tags.service';
import { AuthorsService } from './services/authors.service';
import { FeedService } from './services/feed.service';
import { BlogAdminService } from './services/blog-admin.service';
import { PostFeaturedImageService } from './services/post-featured-image.service';

@Module({
  imports: [
    NestlancerConfigModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      load: [blogConfig],
    }),
    DatabaseModule.forRoot(),
    AuthLibModule,
    LoggerModule.forRoot(),
    MetricsModule,
    TracingModule.forRoot(),
    CacheModule.forRoot(),
    SearchModule.forRoot(),
    OutboxModule.forRoot(),
    StorageModule.forRoot(),
  ],
  controllers: [
    // CommentsController before PostInteractionsController (both use posts/:slug/*).
    CommentsController,
    // PostInteractionsController before PostsPublicController so auth-only routes match
    // before the public POST /posts/:slug/view handler.
    PostInteractionsController,
    PostsPublicController,
    BlogCategoriesPublicController,
    BlogTagsPublicController,
    AuthorsPublicController,
    FeedPublicController,
    StandaloneCommentsController,
    BookmarksController,
    PostsAdminController,
    CommentsAdminController,
    BlogCategoriesAdminController,
    BlogTagsAdminController,
    BlogAuthorsAdminController,
    BlogAnalyticsAdminController,
  ],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
    PostsService,
    PostPublishingService,
    PostSchedulingService,
    // PostRevisionsService,
    PostInteractionsService,
    PostSearchService,
    PostViewsService,
    CommentsService,
    CommentModerationService,
    // CommentReactionsService,
    CategoriesService,
    TagsService,
    // BookmarksService,
    AuthorsService,
    FeedService,
    // RelatedPostsService,
    // BlogAnalyticsService,
    BlogAdminService,
    PostFeaturedImageService,
  ],
})
export class AppModule {}
