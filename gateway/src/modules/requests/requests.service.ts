import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RequestsService {
  private readonly logger = new Logger(RequestsService.name);
}
