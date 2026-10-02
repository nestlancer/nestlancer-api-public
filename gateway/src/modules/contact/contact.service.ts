import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
}
