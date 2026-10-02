import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesService } from '../../../src/preferences/preferences.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('PreferencesService', () => {
  let provider: PreferencesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PreferencesService,
        { provide: PrismaReadService, useValue: {} },
        { provide: PrismaWriteService, useValue: {} },
        // Add mocked dependencies here
      ],
    }).compile();

    provider = module.get<PreferencesService>(PreferencesService);
  });

  it('should be defined', () => {
    expect(provider).toBeDefined();
  });
});
