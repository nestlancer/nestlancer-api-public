import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsController } from '../../../src/controllers/projects.controller';
import { ProjectsService } from '../../../src/services/projects.service';
import { ProjectTimelineService } from '../../../src/services/project-timeline.service';
import { ProjectDeliverablesService } from '../../../src/services/project-deliverables.service';
import { ProjectPaymentsService } from '../../../src/services/project-payments.service';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { ProjectPaymentScheduleService } from '../../../src/services/project-payment-schedule.service';
import { MessagingProxyService } from '../../../src/services/messaging-proxy.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  let projectsService: ProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [
        {
          provide: ProjectsService,
          useValue: {
            getMyProjects: jest.fn(),
            getProjectDetails: jest.fn(),
            approveProject: jest.fn(),
            requestRevision: jest.fn(),
          },
        },
        { provide: ProjectTimelineService, useValue: { getTimeline: jest.fn() } },
        { provide: ProjectDeliverablesService, useValue: { getDeliverables: jest.fn() } },
        { provide: ProjectPaymentsService, useValue: { getPayments: jest.fn() } },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        { provide: MessagingProxyService, useValue: { postProjectMessage: jest.fn() } },
        { provide: ProjectPaymentScheduleService, useValue: {} },
      ],
    }).compile();

    controller = module.get<ProjectsController>(ProjectsController);
    projectsService = module.get<ProjectsService>(ProjectsService);
  });

  describe('approveProject', () => {
    it('should call approveProject on service', async () => {
      const mockResult = { status: 'completed' };
      jest.spyOn(projectsService, 'approveProject').mockResolvedValue(mockResult as any);

      const dto: any = { rating: 5, feedback: {} };
      const result = await controller.approveProject('user1', 'proj1', dto);

      expect(result).toEqual(mockResult);
      expect(projectsService.approveProject).toHaveBeenCalledWith('user1', 'proj1', dto);
    });
  });
});
