import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from '../../../src/guards/admin.guard';

describe('AdminGuard', () => {
  let provider: AdminGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdminGuard],
    }).compile();

    provider = module.get<AdminGuard>(AdminGuard);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
