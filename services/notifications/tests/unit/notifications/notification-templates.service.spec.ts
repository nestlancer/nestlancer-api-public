import { Test, TestingModule } from '@nestjs/testing';
import { NotificationTemplatesService } from '../../../src/notifications/notification-templates.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('NotificationTemplatesService', () => {
  let provider: NotificationTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationTemplatesService,
        { provide: PrismaReadService, useValue: {} },
        { provide: PrismaWriteService, useValue: {} },
        // Add mocked dependencies here
      ],
    }).compile();

    provider = module.get<NotificationTemplatesService>(NotificationTemplatesService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
