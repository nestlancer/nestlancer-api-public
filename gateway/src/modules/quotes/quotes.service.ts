import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class QuotesService {
  private readonly logger = new Logger(QuotesService.name);
}
