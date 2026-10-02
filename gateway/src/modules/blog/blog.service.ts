import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class BlogService {
  private readonly logger = new Logger(BlogService.name);
}
