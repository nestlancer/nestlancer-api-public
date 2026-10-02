import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PortfolioService {
  private readonly logger = new Logger(PortfolioService.name);
}
