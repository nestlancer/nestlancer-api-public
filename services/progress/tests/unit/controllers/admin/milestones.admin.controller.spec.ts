import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { MilestonesAdminController } from '../../../../src/controllers/admin/milestones.admin.controller';
import { MilestonesService } from '../../../../src/services/milestones.service';
import { CreateMilestoneDto } from '../../../../src/dto/create-milestone.dto';
import { UpdateMilestoneDto } from '../../../../src/dto/update-milestone.dto';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';

describe('MilestonesAdminController', () => {
  let controller: MilestonesAdminController;
  let milestonesService: jest.Mocked<MilestonesService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MilestonesAdminController],
      providers: [
        {
          provide: MilestonesService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            complete: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MilestonesAdminController>(MilestonesAdminController);
    milestonesService = module.get(MilestonesService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createMilestone', () => {
    it('should create a milestone', async () => {
      milestonesService.create.mockResolvedValue({ id: 'm1' } as any);
      const dto: CreateMilestoneDto = {
        name: 'M1',
        description: 'Desc',
        startDate: '2023-01-01',
        endDate: '2023-02-01',
      };

      const result = await controller.createMilestone('p1', dto);

      expect(milestonesService.create).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'm1' } });
    });
  });

  describe('updateMilestone', () => {
    it('should update a milestone', async () => {
      milestonesService.update.mockResolvedValue({ id: 'm1', name: 'M2' } as any);
      const dto: UpdateMilestoneDto = { name: 'M2' };

      const result = await controller.updateMilestone('m1', dto);

      expect(milestonesService.update).toHaveBeenCalledWith('m1', dto);
      expect(result).toEqual({ status: 'success', data: { id: 'm1', name: 'M2' } });
    });
  });

  describe('completeMilestone', () => {
    it('should mark milestone as complete', async () => {
      milestonesService.complete.mockResolvedValue({ id: 'm1', status: 'COMPLETED' } as any);

      const result = await controller.completeMilestone('m1');

      expect(milestonesService.complete).toHaveBeenCalledWith('m1');
      expect(result).toEqual({ status: 'success', data: { id: 'm1', status: 'COMPLETED' } });
    });
  });
});
