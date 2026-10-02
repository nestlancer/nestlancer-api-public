import { Test, TestingModule } from '@nestjs/testing';
import { PreferencesController } from '../../../src/preferences/preferences.controller';
import { PreferencesService } from '../../../src/preferences/preferences.service';

describe('PreferencesController', () => {
  let controller: PreferencesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PreferencesController],
      providers: [
        {
          provide: PreferencesService,
          useValue: {
            getPreferences: jest.fn(),
            updatePreferences: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<PreferencesController>(PreferencesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
