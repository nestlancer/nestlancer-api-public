import { Test, TestingModule } from '@nestjs/testing';
import { AuditExportService } from '../../../src/services/audit-export.service';
import { QueuePublisherService } from '@nestlancer/queue';

describe('AuditExportService', () => {
  let service: AuditExportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditExportService,
        {
          provide: QueuePublisherService,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<AuditExportService>(AuditExportService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
