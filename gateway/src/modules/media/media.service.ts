import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
}
