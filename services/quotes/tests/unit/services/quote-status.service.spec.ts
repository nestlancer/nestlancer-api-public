import { Test, TestingModule } from '@nestjs/testing';
import { QuoteStatusService } from '../../../src/services/quote-status.service';
import { PrismaWriteService } from '@nestlancer/database';
import { ProjectsProvisionerService } from '../../../src/services/projects-provisioner.service';

describe('QuoteStatusService', () => {
  let service: QuoteStatusService;
  let prismaWrite: PrismaWriteService;
  let projectsProvisioner: { provisionFromAcceptedQuote: jest.Mock };

  beforeEach(async () => {
    projectsProvisioner = { provisionFromAcceptedQuote: jest.fn().mockResolvedValue(null) };
    const prismaWriteMock = {
      $transaction: jest.fn((cb: (tx: typeof prismaWriteMock) => unknown) => cb(prismaWriteMock)),
      quote: {
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      projectRequest: { update: jest.fn() },
      outbox: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuoteStatusService,
        {
          provide: PrismaWriteService,
          useValue: prismaWriteMock,
        },
        {
          provide: ProjectsProvisionerService,
          useValue: projectsProvisioner,
        },
      ],
    }).compile();

    service = module.get<QuoteStatusService>(QuoteStatusService);
    prismaWrite = module.get<PrismaWriteService>(PrismaWriteService);
  });

  describe('acceptQuote', () => {
    it('should accept quote successfully', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'SENT',
        validUntil: futureDate,
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);
      jest.spyOn(prismaWrite.quote, 'update').mockResolvedValue({ acceptedAt: new Date() } as any);

      const dto: any = {
        acceptTerms: true,
        signatureName: 'John',
        signatureDate: new Date().toISOString(),
      };
      const result = await service.acceptQuote('user1', 'quote1', dto);

      expect(result.status).toEqual('accepted');
      expect(prismaWrite.quote.updateMany).toHaveBeenCalled();
      expect(prismaWrite.outbox.create).toHaveBeenCalled();
      expect(projectsProvisioner.provisionFromAcceptedQuote).toHaveBeenCalledWith({
        quoteId: 'quote1',
        requestId: 'req1',
        userId: 'user1',
      });
    });

    it('returns provisioned project id when sync create succeeds', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'SENT',
        validUntil: futureDate,
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);
      jest.spyOn(prismaWrite.quote, 'update').mockResolvedValue({ acceptedAt: new Date() } as any);
      projectsProvisioner.provisionFromAcceptedQuote.mockResolvedValue({
        projectId: 'proj-1',
        quoteId: 'quote1',
        requestId: 'req1',
        status: 'PENDING_PAYMENT',
        created: true,
      });

      const dto: any = {
        acceptTerms: true,
        signatureName: 'John',
        signatureDate: new Date().toISOString(),
      };
      const result = await service.acceptQuote('user1', 'quote1', dto);

      expect(result.projectId).toBe('proj-1');
      expect(result.project).toEqual({ id: 'proj-1', status: 'pendingPayment' });
    });

    it('should reject accept when quote status is PENDING', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'PENDING',
        validUntil: futureDate,
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);

      const dto: any = {
        acceptTerms: true,
        signatureName: 'John',
        signatureDate: new Date().toISOString(),
      };
      await expect(service.acceptQuote('user1', 'quote1', dto)).rejects.toThrow();
    });

    it('should throw if quote expired', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'SENT',
        validUntil: pastDate,
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);

      const dto: any = {
        acceptTerms: true,
        signatureName: 'John',
        signatureDate: new Date().toISOString(),
      };
      await expect(service.acceptQuote('user1', 'quote1', dto)).rejects.toThrow();
    });
  });

  describe('declineQuote', () => {
    it('should set request to CHANGES_REQUESTED when revision requested', async () => {
      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'SENT',
        validUntil: new Date(Date.now() + 86400000),
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);
      jest.spyOn(prismaWrite.quote, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaWrite.projectRequest, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaWrite.outbox, 'create').mockResolvedValue({} as any);

      await service.declineQuote('user1', 'quote1', {
        reason: 'budgetConstraints',
        requestRevision: true,
      } as any);

      expect(prismaWrite.projectRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'CHANGES_REQUESTED' },
      });
      expect(prismaWrite.outbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'QUOTE_REVISION_REQUESTED' }),
        }),
      );
    });

    it('should set request to REJECTED when revision not requested', async () => {
      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'SENT',
        validUntil: new Date(Date.now() + 86400000),
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);
      jest.spyOn(prismaWrite.quote, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaWrite.projectRequest, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaWrite.outbox, 'create').mockResolvedValue({} as any);

      await service.declineQuote('user1', 'quote1', {
        reason: 'budgetConstraints',
        requestRevision: false,
      } as any);

      expect(prismaWrite.projectRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'REJECTED' },
      });
      expect(prismaWrite.outbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'QUOTE_DECLINED' }),
        }),
      );
    });
  });

  describe('requestChanges', () => {
    it('should mark quote and request as CHANGES_REQUESTED', async () => {
      const mockQuote = {
        id: 'quote1',
        userId: 'user1',
        requestId: 'req1',
        status: 'SENT',
        validUntil: new Date(Date.now() + 86400000),
      };
      jest.spyOn(prismaWrite.quote, 'findFirst').mockResolvedValue(mockQuote as any);
      jest.spyOn(prismaWrite.quote, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaWrite.projectRequest, 'update').mockResolvedValue({} as any);
      jest.spyOn(prismaWrite.outbox, 'create').mockResolvedValue({} as any);

      const result = await service.requestChanges('user1', 'quote1', {
        changes: [{ area: 'budget', request: 'Lower total by 10%' }],
      } as any);

      expect(result.status).toBe('changesRequested');
      expect(prismaWrite.projectRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: { status: 'CHANGES_REQUESTED' },
      });
    });
  });
});
