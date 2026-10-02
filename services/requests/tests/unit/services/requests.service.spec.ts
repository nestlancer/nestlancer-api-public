import { Test, TestingModule } from '@nestjs/testing';
import { RequestsService } from '../../../src/services/requests.service';
import { AdminCapacityService } from '../../../src/services/admin-capacity.service';
import { PrismaWriteService, PrismaReadService } from '@nestlancer/database';
import { BusinessLogicException } from '@nestlancer/common';

describe('RequestsService', () => {
  let service: RequestsService;
  let prismaRead: PrismaReadService;
  let prismaWrite: PrismaWriteService;
  let txProjectRequestUpdate: jest.Mock;
  let txOutboxCreate: jest.Mock;

  beforeEach(async () => {
    txProjectRequestUpdate = jest.fn();
    txOutboxCreate = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: PrismaReadService,
          useValue: {
            projectRequest: { findFirst: jest.fn(), findMany: jest.fn() },
            servicePackage: { findFirst: jest.fn() },
            portfolioItem: { findFirst: jest.fn() },
          },
        },
        {
          provide: PrismaWriteService,
          useValue: {
            $transaction: jest.fn((cb) =>
              cb({
                projectRequest: { update: txProjectRequestUpdate },
                requestStatusHistory: { create: jest.fn() },
                outbox: { create: txOutboxCreate },
              }),
            ),
            projectRequest: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
            requestStatusHistory: { create: jest.fn() },
            outbox: { create: jest.fn() },
          },
        },
        {
          provide: AdminCapacityService,
          useValue: { assertCanAcceptRequest: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    prismaRead = module.get<PrismaReadService>(PrismaReadService);
    prismaWrite = module.get<PrismaWriteService>(PrismaWriteService);
  });

  describe('submitRequest', () => {
    it('should submit valid draft request', async () => {
      const mockReq = {
        id: 'req1',
        userId: 'user1',
        status: 'DRAFT',
        budgetMin: 100,
        deadline: new Date(),
      };
      jest.spyOn(prismaWrite.projectRequest, 'findFirst').mockResolvedValue(mockReq as any);

      const result = await service.submitRequest('user1', 'req1');

      expect(result.status).toEqual('submitted');
      expect(txProjectRequestUpdate).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'SUBMITTED', submittedAt: expect.any(Date) },
      });
      expect(txOutboxCreate).toHaveBeenCalled();
    });

    it('should throw if request not found', async () => {
      jest.spyOn(prismaWrite.projectRequest, 'findFirst').mockResolvedValue(null);
      await expect(service.submitRequest('user1', 'req1')).rejects.toThrow();
    });

    it('should throw if missing budget', async () => {
      const mockReq = { id: 'req1', userId: 'user1', status: 'DRAFT', deadline: new Date() }; // missing budgetMin
      jest.spyOn(prismaWrite.projectRequest, 'findFirst').mockResolvedValue(mockReq as any);

      await expect(service.submitRequest('user1', 'req1')).rejects.toThrow();
    });
  });

  describe('createRequest', () => {
    it('prefills budget from service package when budget is zero', async () => {
      const txCreate = jest.fn().mockResolvedValue({
        id: 'req-new',
        status: 'DRAFT',
        title: 'Landing Page Package',
        category: 'webDevelopment',
        createdAt: new Date(),
      });
      (prismaWrite.$transaction as jest.Mock).mockImplementation((cb) =>
        cb({
          projectRequest: { create: txCreate },
          requestStatusHistory: { create: jest.fn() },
        }),
      );

      jest.spyOn(prismaRead.servicePackage, 'findFirst').mockResolvedValue({
        id: 'pkg-1',
        name: 'Landing Page Package',
        description: 'A professional landing page with responsive design.',
        basePricePaise: 120_000_00,
      } as any);

      const dto = {
        title: 'Landing Page Package',
        description: 'A professional landing page with responsive design.',
        category: 'webDevelopment',
        budget: { min: 0, max: 0, currency: 'INR', flexible: true },
        timeline: {
          preferredStartDate: '2025-01-01T00:00:00Z',
          deadline: '2025-06-01T00:00:00Z',
          flexible: false,
        },
        requirements: ['Responsive layout'],
        servicePackageId: 'pkg-1',
      };

      await service.createRequest('user-1', dto as any);

      expect(txCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            servicePackageId: 'pkg-1',
            budgetMin: 120_000_00,
            budgetMax: 120_000_00,
          }),
        }),
      );
    });
  });
});
