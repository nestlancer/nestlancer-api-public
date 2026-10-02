import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';

import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';

import { ContactAdminController } from '../../src/controllers/admin/contact.admin.controller';
import { ContactAdminService } from '../../src/services/contact-admin.service';
import { ContactResponseService } from '../../src/services/contact-response.service';
import { ContactService } from '../../src/services/contact.service';

describe('ContactAdminController', () => {
  let controller: ContactAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactAdminController],
      providers: [
        {
          provide: ContactService,
          useValue: {
            findAll: jest.fn().mockResolvedValue({ items: [], totalItems: 0 }),
            findById: jest.fn(),
          },
        },
        { provide: ContactResponseService, useValue: { respond: jest.fn() } },
        {
          provide: ContactAdminService,
          useValue: {
            getStatistics: jest.fn().mockResolvedValue({ total: 0 }),
            markAsSpam: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn(),
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ContactAdminController>(ContactAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
