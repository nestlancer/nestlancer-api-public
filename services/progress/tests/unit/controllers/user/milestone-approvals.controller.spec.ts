import { Test, TestingModule } from '@nestjs/testing';
import { MilestoneApprovalsController } from '../../../../src/controllers/user/milestone-approvals.controller';
import { MilestoneApprovalService } from '../../../../src/services/milestone-approval.service';
import { ApproveMilestoneDto } from '../../../../src/dto/approve-milestone.dto';
import { RequestMilestoneRevisionDto } from '../../../../src/dto/request-milestone-revision.dto';

describe('MilestoneApprovalsController', () => {
  let controller: MilestoneApprovalsController;
  let approvalService: jest.Mocked<MilestoneApprovalService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilestoneApprovalsController],
      providers: [
        {
          provide: MilestoneApprovalService,
          useValue: {
            approve: jest.fn(),
            requestRevision: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MilestoneApprovalsController>(MilestoneApprovalsController);
    approvalService = module.get(MilestoneApprovalService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('approveMilestone', () => {
    it('should approve a milestone', async () => {
      approvalService.approve.mockResolvedValue({ id: 'm1', status: 'APPROVED' } as any);
      const dto = new ApproveMilestoneDto();

      const result = await controller.approveMilestone('m1', 'user1', dto);

      expect(approvalService.approve).toHaveBeenCalledWith('m1', 'user1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'm1', status: 'APPROVED' } });
    });
  });

  describe('requestRevision', () => {
    it('should request revision on a milestone', async () => {
      approvalService.requestRevision.mockResolvedValue({
        id: 'm1',
        status: 'REVISION_REQUESTED',
      } as any);
      const dto = new RequestMilestoneRevisionDto();

      const result = await controller.requestRevision('m1', 'user1', dto);

      expect(approvalService.requestRevision).toHaveBeenCalledWith('m1', 'user1', dto);
      expect(result).toEqual({
        status: 'success',
        data: { id: 'm1', status: 'REVISION_REQUESTED' },
      });
    });
  });
});
