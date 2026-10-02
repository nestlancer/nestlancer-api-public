import { Test, TestingModule } from '@nestjs/testing';

import { SpamFilterService } from '../../src/services/spam-filter.service';

describe('SpamFilterService', () => {
  let service: SpamFilterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SpamFilterService],
    }).compile();

    service = module.get<SpamFilterService>(SpamFilterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should log low score for normal messages', () => {
    const result = service.checkSpam(
      'john@gmail.com',
      'Hello, this is a legitimate question about projects.',
    );
    expect(result.isSpam).toBe(false);
  });

  it('should log high score for spammer texts', () => {
    const spamText =
      'buy followers SEO services http://link1.com http://link2.com http://link3.com http://link4.com http://link5.com';
    const result = service.checkSpam('spammer@tempmail.com', spamText);
    expect(result.isSpam).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0.7);
  });
});
