import { Test, TestingModule } from '@nestjs/testing';
import { NotificationStatsService } from '../../../src/notifications/notification-stats.service';
import { PrismaReadService } from '@nestlancer/database';

describe('NotificationStatsService', () => {
  let provider: NotificationStatsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationStatsService,
        { provide: PrismaReadService, useValue: {} },
        // Add mocked dependencies here
      ],
    }).compile();

    provider = module.get<NotificationStatsService>(NotificationStatsService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
