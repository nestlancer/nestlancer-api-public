import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseModule } from '../../src/database.module';
import { PrismaWriteService } from '../../src/prisma-write.service';
import { PrismaReadService } from '../../src/prisma-read.service';
import { SOFT_DELETE, NOT_DELETED } from '../../src/utils/soft-delete.util';
import { ConfigModule } from '@nestjs/config';

describe('Database Integration', () => {
  let writeDb: PrismaWriteService;
  let readDb: PrismaReadService;
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env.test' }),
        DatabaseModule.forRoot(),
      ],
    }).compile();

    writeDb = module.get<PrismaWriteService>(PrismaWriteService);
    readDb = module.get<PrismaReadService>(PrismaReadService);

    await module.init();
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  it('should connect and query the database', async () => {
    expect(writeDb).toBeDefined();
    expect(readDb).toBeDefined();

    const softDeleted = { deletedAt: SOFT_DELETE.deletedAt };
    expect(softDeleted.deletedAt).toBeInstanceOf(Date);
    expect(NOT_DELETED).toEqual({ deletedAt: null });
  });
});
