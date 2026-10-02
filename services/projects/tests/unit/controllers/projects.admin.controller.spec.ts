import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsAdminController } from '../../../src/controllers/projects.admin.controller';
import { ProjectsAdminService } from '../../../src/services/projects.admin.service';
import { ProjectDuplicationService } from '../../../src/services/project-duplication.service';
import { ProjectPortfolioBridgeService } from '../../../src/services/project-portfolio-bridge.service';
import { DocumentGenerationService } from '@nestlancer/documents';
import { JwtAuthGuard, RolesGuard } from '@nestlancer/auth-lib';
import { PrismaReadService, PrismaWriteService } from '@nestlancer/database';

describe('ProjectsAdminController', () => {
  let controller: ProjectsAdminController;
  let adminService: jest.Mocked<ProjectsAdminService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsAdminController],
      providers: [
        {
          provide: ProjectsAdminService,
          useValue: {
            listProjects: jest.fn(),
            updateProjectStatus: jest.fn(),
            updateProject: jest.fn(),
          },
        },
        { provide: PrismaWriteService, useValue: {} },
        { provide: PrismaReadService, useValue: {} },
        { provide: ProjectDuplicationService, useValue: {} },
        { provide: ProjectPortfolioBridgeService, useValue: {} },
        { provide: DocumentGenerationService, useValue: {} },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<ProjectsAdminController>(ProjectsAdminController);
    adminService = module.get(ProjectsAdminService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listProjects', () => {
    it('should call listProjects with parsed pagination options', async () => {
      const payload = { data: [], pagination: { page: 2, limit: 10, total: 0, totalPages: 0 } };
      adminService.listProjects.mockResolvedValue(payload as any);

      const result = await controller.listProjects('2', '10');

      expect(adminService.listProjects).toHaveBeenCalledWith(
        2,
        10,
        undefined,
        undefined,
        undefined,
      );
      expect(result).toEqual(payload);
    });

    it('should use default pagination options', async () => {
      adminService.listProjects.mockResolvedValue({ data: [] } as any);
      await controller.listProjects();
      expect(adminService.listProjects).toHaveBeenCalledWith(
        1,
        20,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe('updateProjectStatus', () => {
    it('should call updateProjectStatus on service', async () => {
      adminService.updateProjectStatus.mockResolvedValue({ id: 'p1' } as any);
      const dto = { status: 'ACTIVE' } as any;

      const result = await controller.updateProjectStatus('p1', 'admin1', dto);

      expect(adminService.updateProjectStatus).toHaveBeenCalledWith('p1', 'admin1', dto);
      expect(result).toEqual({ id: 'p1' });
    });
  });

  describe('updateProject', () => {
    it('should call updateProject on service', async () => {
      adminService.updateProject.mockResolvedValue({ id: 'p1' } as any);
      const dto = { title: 'New' } as any;

      const result = await controller.updateProject('p1', dto);

      expect(adminService.updateProject).toHaveBeenCalledWith('p1', dto);
      expect(result).toEqual({ id: 'p1' });
    });
  });
});
