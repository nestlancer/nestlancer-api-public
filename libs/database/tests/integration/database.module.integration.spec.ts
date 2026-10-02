import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/database.module';
import { PrismaWriteService } from '../../src/prisma-write.service';
import { PrismaReadService } from '../../src/prisma-read.service';
import { ConfigModule } from '@nestjs/config';

describe('DatabaseModule (Integration)', () => {
  let module: TestingModule;
  let writeService: PrismaWriteService;
  let readService: PrismaReadService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        DatabaseModule.forRoot(),
      ],
    }).compile();

    writeService = module.get<PrismaWriteService>(PrismaWriteService);
    readService = module.get<PrismaReadService>(PrismaReadService);

    await module.init();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should be defined', () => {
    expect(writeService).toBeDefined();
    expect(readService).toBeDefined();
  });

  it('should provide separate instances for read and write', () => {
    expect(writeService).not.toBe(readService);
  });

  it('should initialize module and establish prisma connections', async () => {
    expect(module).toBeDefined();
    expect(writeService).toBeDefined();
    expect(readService).toBeDefined();
  });
});
