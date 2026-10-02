import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceModeService } from '../../../src/services/maintenance-mode.service';
import { SystemConfigService } from '../../../src/services/system-config.service';
import { CacheService } from '@nestlancer/cache';
import { PrismaWriteService } from '@nestlancer/database';
import { ToggleMaintenanceDto } from '../../../src/dto/toggle-maintenance.dto';

describe('MaintenanceModeService', () => {
  let service: MaintenanceModeService;
  let configService: jest.Mocked<SystemConfigService>;
  let cacheService: { get: jest.Mock; set: jest.Mock };
  let prismaWrite: { session: { deleteMany: jest.Mock } };

  beforeEach(async () => {
    cacheService = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    };
    prismaWrite = {
      session: {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceModeService,
        {
          provide: SystemConfigService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
        { provide: CacheService, useValue: cacheService },
        { provide: PrismaWriteService, useValue: prismaWrite },
      ],
    }).compile();

    service = module.get<MaintenanceModeService>(MaintenanceModeService);
    configService = module.get(SystemConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return config from SystemConfigService', async () => {
      const mockConfig = { enabled: true, message: 'Maintenance' };
      configService.get.mockResolvedValue(mockConfig);

      const result = await service.getStatus();
      expect(configService.get).toHaveBeenCalledWith('MAINTENANCE_MODE');
      expect(result).toEqual(mockConfig);
    });

    it('should return default config if configService fails', async () => {
      configService.get.mockRejectedValue(new Error('not found'));

      const result = await service.getStatus();
      expect(result).toEqual({ enabled: false });
    });
  });

  describe('toggle', () => {
    it('should toggle, cache, and revoke non-admin sessions when enabling', async () => {
      jest.spyOn(service, 'getStatus').mockResolvedValue({ enabled: false } as any);
      const dto: ToggleMaintenanceDto = { enabled: true, message: 'Updating' };
      configService.set.mockResolvedValue(undefined as any);

      const result = await service.toggle(dto, 'admin1');

      expect(configService.set).toHaveBeenCalledWith(
        {
          key: 'MAINTENANCE_MODE',
          value: expect.objectContaining({ enabled: true, message: 'Updating' }),
        },
        'admin1',
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'system:maintenance',
        expect.objectContaining({ enabled: true, message: 'Updating' }),
      );
      expect(prismaWrite.session.deleteMany).toHaveBeenCalledWith({
        where: { user: { role: { not: 'ADMIN' } } },
      });
      expect(result.enabled).toBe(true);
      expect(result.message).toBe('Updating');
    });

    it('should return unchanged when status is already in the requested state', async () => {
      jest.spyOn(service, 'getStatus').mockResolvedValue({ enabled: true, message: 'Busy' } as any);
      const dto: ToggleMaintenanceDto = { enabled: true };

      const result = await service.toggle(dto, 'admin1');
      expect(result).toEqual(expect.objectContaining({ enabled: true, unchanged: true }));
      expect(configService.set).not.toHaveBeenCalled();
      expect(prismaWrite.session.deleteMany).not.toHaveBeenCalled();
    });
  });
});
