import { Test, TestingModule } from '@nestjs/testing';
import { CommentModerationService } from '../../../src/services/comment-moderation.service';
import { ConfigService } from '@nestjs/config';

describe('CommentModerationService', () => {
  let service: CommentModerationService;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentModerationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CommentModerationService>(CommentModerationService);
    configService = module.get(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkContent', () => {
    it('should return true for content below spam threshold', async () => {
      configService.get.mockReturnValue(0.7);
      const result = await service.checkContent('This is a normal comment');
      expect(result).toBe(true);
    });

    it('should return false for content above spam threshold', async () => {
      configService.get.mockReturnValue(0.5);
      const spamContent = 'Check this http://spam.com http://more-spam.com http://evil.com';
      const result = await service.checkContent(spamContent);
      expect(result).toBe(false); // 3 urls * 0.2 = 0.6 >= 0.5
    });

    it('should default threshold to 0.7 if config missing', async () => {
      configService.get.mockImplementation((key, defaultValue) => defaultValue);
      const result = await service.checkContent('Only one link http://good.com');
      // score = 0.2 < 0.7, so true
      expect(result).toBe(true);
    });
  });
});
