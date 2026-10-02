import { Test, TestingModule } from '@nestjs/testing';
import { PrismaReadService } from '../../src/prisma-read.service';

jest.mock('@prisma/client', () => {
  return {
    PrismaClient: class {
      constructor(options: any) {
        (this as any).datasourceUrl =
          options?.datasources?.db?.url ||
          options?.datasourceUrl ||
          process.env.DATABASE_READ_URL ||
          process.env.DATABASE_URL;
      }
      async $connect() {}
      async $disconnect() {}
    },
  };
});

describe('PrismaReadService', () => {
  let service: PrismaReadService;

  beforeAll(() => {
    delete process.env.DATABASE_READ_URL;
    delete process.env.DATABASE_URL;
    process.env.DATABASE_URL = 'prisma://accelerate.net/?api_key=test';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaReadService],
    }).compile();

    service = module.get<PrismaReadService>(PrismaReadService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should use DATABASE_READ_URL if provided', () => {
    process.env.DATABASE_READ_URL = 'postgresql://read:read@localhost:5432/nestlancer';
    const readService = new PrismaReadService();
    expect((readService as any).datasourceUrl).toBe(process.env.DATABASE_READ_URL);
  });

  it('should fallback to DATABASE_URL if DATABASE_READ_URL is not provided', () => {
    delete process.env.DATABASE_READ_URL;
    process.env.DATABASE_URL = 'postgresql://write:write@localhost:5432/nestlancer';
    const readService = new PrismaReadService();
    expect((readService as any).datasourceUrl).toBe(process.env.DATABASE_URL);
  });
});
