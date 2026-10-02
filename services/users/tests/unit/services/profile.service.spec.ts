import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../../../src/services/profile.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { AvatarService } from '../../../src/services/avatar.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaRead: PrismaReadService;
  let prismaWrite: PrismaWriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaReadService,
          useValue: {
            user: { findUnique: jest.fn() },
            projectRequest: {
              count: jest.fn().mockResolvedValue(5),
              groupBy: jest.fn().mockResolvedValue([]),
            },
            project: {
              count: jest.fn().mockResolvedValue(2),
              groupBy: jest.fn().mockResolvedValue([]),
            },
            quote: {
              count: jest.fn().mockResolvedValue(3),
              groupBy: jest.fn().mockResolvedValue([]),
            },
            review: {
              aggregate: jest.fn().mockResolvedValue({ _avg: { rating: 4.8 } }),
              groupBy: jest.fn().mockResolvedValue([]),
            },
            payment: { aggregate: jest.fn().mockResolvedValue({ _sum: { amount: 100 } }) },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            user: { update: jest.fn() },
            outbox: { create: jest.fn() },
          },
        },
        {
          provide: AvatarService,
          useValue: {
            resolveAvatarDisplay: jest.fn().mockResolvedValue({}),
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaRead = module.get<PrismaReadService>(PrismaReadService);
    prismaWrite = module.get<PrismaWriteService>(PrismaWriteService);
  });

  describe('getProfile', () => {
    it('should return formatted profile', async () => {
      const mockUser = {
        id: 'usr1',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'USER',
        emailVerified: true,
        brandGuidelines: { headline: 'Builder', bio: 'Ships fast', skills: ['NestJS'] },
        preferences: { timezone: 'UTC', language: 'en', country: 'US' },
        authConfig: { twoFactorEnabled: false },
      };

      jest.spyOn(prismaRead.user, 'findUnique').mockResolvedValue(mockUser as any);

      const result = await service.getProfile('usr1');
      expect(result.id).toEqual('usr1');
      expect(result.phone).toBeNull();
      expect(result.headline).toEqual('Builder');
      expect(result.skills).toEqual(['NestJS']);
      expect(result.timezone).toEqual('UTC');
    });

    it('should throw exception if user not found', async () => {
      jest.spyOn(prismaRead.user, 'findUnique').mockResolvedValue(null);

      await expect(service.getProfile('usr1')).rejects.toThrow();
    });
  });
});
