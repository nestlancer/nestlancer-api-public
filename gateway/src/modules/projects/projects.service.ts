import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
}
