import { Test, TestingModule } from '@nestjs/testing';
import { RequestsAdminController } from '../../../src/controllers/requests.admin.controller';
import { RequestsAdminService } from '../../../src/services/requests.admin.service';
import { QuotesAdminService } from '../../../src/services/quotes.admin.service';
import { RequestStatsService } from '../../../src/services/request-stats.service';
import { RequestAttachmentsService } from '../../../src/services/request-attachments.service';
import { HttpStatus } from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';
import { AdminCapacityService } from '../../../src/services/admin-capacity.service';

describe('RequestsAdminController', () => {
  let controller: RequestsAdminController;
  let adminService: jest.Mocked<RequestsAdminService>;
  let quotesService: jest.Mocked<QuotesAdminService>;
  let statsService: jest.Mocked<RequestStatsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsAdminController],
      providers: [
        {
          provide: RequestsAdminService,
          useValue: {
            listRequests: jest.fn(),
            getRequestDetailsAdmin: jest.fn(),
            updateRequestStatus: jest.fn(),
            addNote: jest.fn(),
            getNotes: jest.fn(),
          },
        },
        {
          provide: QuotesAdminService,
          useValue: {
            createQuote: jest.fn(),
          },
        },
        {
          provide: RequestStatsService,
          useValue: {
            getOverallStats: jest.fn(),
          },
        },
        {
          provide: RequestAttachmentsService,
          useValue: {
            getAttachmentDownloadUrlAdmin: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: { projectRequest: { update: jest.fn() } } },
        { provide: PrismaReadService, useValue: {} },
        { provide: AdminCapacityService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RequestsAdminController>(RequestsAdminController);
    adminService = module.get(RequestsAdminService);
    quotesService = module.get(QuotesAdminService);
    statsService = module.get(RequestStatsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listRequests', () => {
    it('should list requests with parsed pagination and status', () => {
      adminService.listRequests.mockResolvedValue([] as any);

      const result = controller.listRequests('2', '10', 'PENDING');

      expect(adminService.listRequests).toHaveBeenCalledWith(2, 10, 'PENDING', undefined);
      expect(result).resolves.toEqual([]);
    });

    it('should use default values', () => {
      adminService.listRequests.mockResolvedValue([] as any);
      controller.listRequests(undefined, undefined, undefined);
      expect(adminService.listRequests).toHaveBeenCalledWith(1, 20, undefined, undefined);
    });
  });

  describe('getOverallStats', () => {
    it('should return stats', () => {
      statsService.getOverallStats.mockResolvedValue({ totalRequests: 5 } as any);
      const result = controller.getOverallStats();
      expect(result).resolves.toEqual({ totalRequests: 5 });
    });
  });

  describe('getRequestDetails', () => {
    it('should get request details', () => {
      adminService.getRequestDetailsAdmin.mockResolvedValue({ id: 'r1' } as any);
      const result = controller.getRequestDetails('r1');
      expect(adminService.getRequestDetailsAdmin).toHaveBeenCalledWith('r1');
      expect(result).resolves.toEqual({ id: 'r1' });
    });
  });

  describe('updateRequestStatus', () => {
    it('should update request status', () => {
      adminService.updateRequestStatus.mockResolvedValue({ status: true } as any);
      const dto = { status: 'ACCEPTED', notes: 'test note' } as any;

      const result = controller.updateRequestStatus('r1', 'admin1', dto);

      expect(adminService.updateRequestStatus).toHaveBeenCalledWith(
        'r1',
        'admin1',
        'ACCEPTED',
        'test note',
      );
      expect(result).resolves.toEqual({ status: true });
    });
  });

  describe('createQuote', () => {
    it('should create quote and set status CREATED', async () => {
      quotesService.createQuote.mockResolvedValue({ id: 'q1' } as any);
      const res = { status: jest.fn() } as any;
      const dto = { amount: 100 } as any;

      const result = await controller.createQuote('r1', 'admin1', dto, res);

      expect(quotesService.createQuote).toHaveBeenCalledWith('r1', 'admin1', dto);
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(result).toEqual({ id: 'q1' });
    });
  });

  describe('addNote', () => {
    it('should add note and set status CREATED', async () => {
      adminService.addNote.mockResolvedValue({ id: 'n1' } as any);
      const res = { status: jest.fn() } as any;
      const dto = { content: 'test note' } as any;

      const result = await controller.addNote('r1', 'admin1', dto, res);

      expect(adminService.addNote).toHaveBeenCalledWith('r1', 'admin1', 'test note');
      expect(res.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(result).toEqual({ id: 'n1' });
    });
  });

  describe('getNotes', () => {
    it('should get notes', () => {
      adminService.getNotes.mockResolvedValue([] as any);
      const result = controller.getNotes('r1');
      expect(adminService.getNotes).toHaveBeenCalledWith('r1');
      expect(result).resolves.toEqual([]);
    });
  });
});
