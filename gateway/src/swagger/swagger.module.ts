import { Module } from '@nestjs/common';

import { DocsSpecsController } from './docs-specs.controller';
import { DocsSpecsService } from './docs-specs.service';
import { SwaggerEnabledGuard } from './swagger-enabled.guard';

@Module({
  controllers: [DocsSpecsController],
  providers: [DocsSpecsService, SwaggerEnabledGuard],
  exports: [DocsSpecsService],
})
export class SwaggerDocsModule {}
