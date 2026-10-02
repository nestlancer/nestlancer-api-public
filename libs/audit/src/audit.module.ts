import { Module, Global } from '@nestjs/common';
import { AuditWriterService } from './audit-writer.service';
import { AuditRepository } from './audit.repository';

@Global()
@Module({ providers: [AuditWriterService, AuditRepository], exports: [AuditWriterService] })
export class AuditModule {}
