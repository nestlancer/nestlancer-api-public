import { Test, TestingModule } from '@nestjs/testing';
import { DeliverableReviewsController } from '../../../../src/controllers/user/deliverable-reviews.controller';
import { DeliverableReviewService } from '../../../../src/services/deliverable-review.service';
import { ApproveDeliverableDto } from '../../../../src/dto/approve-deliverable.dto';
import { RejectDeliverableDto } from '../../../../src/dto/reject-deliverable.dto';

describe('DeliverableReviewsController', () => {
  let controller: DeliverableReviewsController;
  let reviewService: jest.Mocked<DeliverableReviewService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeliverableReviewsController],
      providers: [
        {
          provide: DeliverableReviewService,
          useValue: {
            approve: jest.fn(),
            reject: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeliverableReviewsController>(DeliverableReviewsController);
    reviewService = module.get(DeliverableReviewService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('approveDeliverable', () => {
    it('should approve a deliverable', async () => {
      reviewService.approve.mockResolvedValue({ id: 'd1', status: 'APPROVED' } as any);
      const dto = new ApproveDeliverableDto();

      const result = await controller.approveDeliverable('d1', 'user1', dto);

      expect(reviewService.approve).toHaveBeenCalledWith('d1', 'user1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'd1', status: 'APPROVED' } });
    });
  });

  describe('rejectDeliverable', () => {
    it('should reject a deliverable', async () => {
      reviewService.reject.mockResolvedValue({ id: 'd1', status: 'REJECTED' } as any);
      const dto = new RejectDeliverableDto();

      const result = await controller.rejectDeliverable('d1', 'user1', dto);

      expect(reviewService.reject).toHaveBeenCalledWith('d1', 'user1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'd1', status: 'REJECTED' } });
    });
  });
});
