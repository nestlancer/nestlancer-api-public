import { Test, TestingModule } from '@nestjs/testing';
import { PrismaWriteService } from '../../src/prisma-write.service';
import { Logger } from '@nestjs/common';

// Mock PrismaClient but keep the inheritance working for the service
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      $connect = jest.fn();
      $disconnect = jest.fn();
    },
  };
});

describe('PrismaWriteService', () => {
  let service: PrismaWriteService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaWriteService],
    }).compile();

    service = module.get<PrismaWriteService>(PrismaWriteService);
    // Suppress logger output during tests
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should connect on module init', async () => {
    const connectSpy = jest.spyOn(service, '$connect');
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalled();
  });

  it('should disconnect on module destroy', async () => {
    const disconnectSpy = jest.spyOn(service, '$disconnect');
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalled();
  });
});
