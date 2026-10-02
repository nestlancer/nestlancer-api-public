import { Test, TestingModule } from '@nestjs/testing';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { ProgressController } from '../../../../src/controllers/user/progress.controller';
import { ProgressTimelineService } from '../../../../src/services/progress-timeline.service';
import { ProgressService } from '../../../../src/services/progress.service';

const allowAllGuard = { canActivate: () => true };

describe('ProgressController', () => {
  let controller: ProgressController;

  const mockTimelineService = {};
  const mockProgressService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProgressController],
      providers: [
        { provide: ProgressTimelineService, useValue: mockTimelineService },
        { provide: ProgressService, useValue: mockProgressService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(allowAllGuard)
      .overrideGuard(RolesGuard)
      .useValue(allowAllGuard)
      .compile();

    controller = module.get<ProgressController>(ProgressController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
