import { Test, TestingModule } from '@nestjs/testing';
import { EmailTemplatesAdminController } from '../../../../src/controllers/admin/email-templates.admin.controller';
import { EmailTemplatesService } from '../../../../src/services/email-templates.service';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { AdminGuard } from '../../../../src/guards/admin.guard';

describe('EmailTemplatesAdminController', () => {
  let controller: EmailTemplatesAdminController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailTemplatesAdminController],
      providers: [
        {
          provide: EmailTemplatesService,
          useValue: {
            findAll: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            preview: jest.fn(),
            test: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<EmailTemplatesAdminController>(EmailTemplatesAdminController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
