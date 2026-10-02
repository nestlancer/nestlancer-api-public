import { BaseRepository } from '../../src/base.repository';
import { PrismaWriteService } from '../../src/prisma-write.service';
import { PrismaReadService } from '../../src/prisma-read.service';

class TestRepository extends BaseRepository {
  getReader() {
    return super.reader;
  }

  getWriter() {
    return super.writer;
  }
}

describe('BaseRepository', () => {
  it('should expose reader and writer services correctly', () => {
    const mockWriteService = {} as PrismaWriteService;
    const mockReadService = {} as PrismaReadService;

    const repo = new TestRepository(mockWriteService, mockReadService);

    expect(repo.getReader()).toBe(mockReadService);
    expect(repo.getWriter()).toBe(mockWriteService);
  });
});
