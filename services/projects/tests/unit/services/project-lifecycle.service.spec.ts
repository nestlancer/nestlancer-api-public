import { Test, TestingModule } from '@nestjs/testing';
import { PrismaWriteService } from '@nestlancer/database';
import { ProjectLifecycleService } from '../../../src/services/project-lifecycle.service';

describe('ProjectLifecycleService', () => {
  let service: ProjectLifecycleService;
  let prisma: { project: { findUnique: jest.Mock; update: jest.Mock } };

  beforeEach(async () => {
    prisma = {
      project: { findUnique: jest.fn(), update: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [ProjectLifecycleService, { provide: PrismaWriteService, useValue: prisma }],
    }).compile();

    service = module.get(ProjectLifecycleService);
  });

  it('starts project when status is PENDING_PAYMENT', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'PENDING_PAYMENT' });
    prisma.project.update.mockResolvedValue({ id: 'proj-1', status: 'IN_PROGRESS' });

    await service.handlePaymentCompleted({
      paymentId: 'pay-1',
      projectId: 'proj-1',
      amount: 100,
      currency: 'INR',
    });

    expect(prisma.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: 'IN_PROGRESS' },
    });
  });

  it('no-ops when project is already in progress', async () => {
    prisma.project.findUnique.mockResolvedValue({ id: 'proj-1', status: 'IN_PROGRESS' });

    await service.handlePaymentCompleted({
      paymentId: 'pay-1',
      projectId: 'proj-1',
      amount: 100,
      currency: 'INR',
    });

    expect(prisma.project.update).not.toHaveBeenCalled();
  });
});
