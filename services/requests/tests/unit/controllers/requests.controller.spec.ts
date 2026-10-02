import { Test, TestingModule } from '@nestjs/testing';
import { RequestsController } from '../../../src/controllers/requests.controller';
import { RequestsService } from '../../../src/services/requests.service';
import { RequestAttachmentsService } from '../../../src/services/request-attachments.service';
import { RequestStatsService } from '../../../src/services/request-stats.service';
import { Response } from 'express';
import { JwtAuthGuard } from '@nestlancer/auth-lib';
import { PrismaReadService } from '@nestlancer/database';

describe('RequestsController', () => {
  let controller: RequestsController;
  let requestsService: RequestsService;

  const mockResponse = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        {
          provide: RequestsService,
          useValue: {
            createRequest: jest.fn(),
            getMyRequests: jest.fn(),
            getRequestDetails: jest.fn(),
            updateRequest: jest.fn(),
            submitRequest: jest.fn(),
            deleteRequest: jest.fn(),
          },
        },
        { provide: RequestAttachmentsService, useValue: {} },
        { provide: RequestStatsService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<RequestsController>(RequestsController);
    requestsService = module.get<RequestsService>(RequestsService);
  });

  describe('createRequest', () => {
    it('should call service and return created response', async () => {
      const mockResult = { id: 'req1', status: 'draft' };
      jest.spyOn(requestsService, 'createRequest').mockResolvedValue(mockResult as any);

      const res = mockResponse();
      const dto: any = { title: 'Test', timeline: {}, budget: {} };

      const result = await controller.createRequest('user1', dto, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(result).toEqual(mockResult);
      expect(requestsService.createRequest).toHaveBeenCalledWith('user1', dto);
    });
  });

  describe('submitRequest', () => {
    it('should call service submit', async () => {
      const mockResult = { id: 'req1', status: 'submitted' };
      jest.spyOn(requestsService, 'submitRequest').mockResolvedValue(mockResult as any);

      const result = await controller.submitRequest('user1', 'req1');

      expect(result).toEqual(mockResult);
      expect(requestsService.submitRequest).toHaveBeenCalledWith('user1', 'req1');
    });
  });
});
