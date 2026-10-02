import { UserRole, UserStatus } from '@nestlancer/common';
import { UsersAdminController } from '../../../src/controllers/users.admin.controller';
import { UsersAdminService } from '../../../src/services/users.admin.service';
import { ActivityService } from '../../../src/services/activity.service';

describe('UsersAdminController', () => {
  let controller: UsersAdminController;
  let adminService: jest.Mocked<UsersAdminService>;
  let activityService: jest.Mocked<ActivityService>;

  beforeEach(() => {
    adminService = {
      listUsers: jest.fn(),
      searchUsers: jest.fn(),
      getUserDetails: jest.fn(),
      updateUser: jest.fn(),
      changeRole: jest.fn(),
      changeUserStatus: jest.fn(),
      adminResetPassword: jest.fn(),
      bulkOperation: jest.fn(),
    } as any;
    activityService = {
      requestDataExport: jest.fn(),
    } as any;
    controller = new UsersAdminController(adminService, activityService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('listUsers', () => {
    it('should list users with parsed pagination, status, and role', async () => {
      adminService.listUsers.mockResolvedValue({ data: [], pagination: {} } as any);
      await controller.listUsers('2', '10', 'ACTIVE', 'USER');
      expect(adminService.listUsers).toHaveBeenCalledWith(2, 10, 'ACTIVE', 'USER');
    });
  });

  describe('changeUserStatus', () => {
    it('should change user status via DTO', async () => {
      adminService.changeUserStatus.mockResolvedValue({ status: UserStatus.SUSPENDED } as any);
      await controller.changeUserStatus('u1', { status: UserStatus.SUSPENDED }, 'admin-1');
      expect(adminService.changeUserStatus).toHaveBeenCalledWith(
        'u1',
        UserStatus.SUSPENDED,
        'admin-1',
      );
    });
  });

  describe('changeRole', () => {
    it('should change user role via DTO', async () => {
      adminService.changeRole.mockResolvedValue({ role: UserRole.USER } as any);
      await controller.changeRole('u1', { role: UserRole.USER }, 'admin-1');
      expect(adminService.changeRole).toHaveBeenCalledWith('u1', UserRole.USER, 'admin-1');
    });
  });

  describe('adminResetPassword', () => {
    it('should reset password with DTO body', async () => {
      adminService.adminResetPassword.mockResolvedValue({ passwordReset: true } as any);
      await controller.adminResetPassword('u1', { newPassword: 'SecurePass1!' }, 'admin-1');
      expect(adminService.adminResetPassword).toHaveBeenCalledWith('u1', 'SecurePass1!', 'admin-1');
    });
  });

  describe('bulkOperation', () => {
    it('should delegate bulk operations', async () => {
      adminService.bulkOperation.mockResolvedValue({ success: 1, failed: 0, errors: [] });
      const dto = { userIds: ['u1'], action: 'suspend' as const };
      await controller.bulkOperation(dto as any);
      expect(adminService.bulkOperation).toHaveBeenCalledWith(dto);
    });
  });

  describe('exportUserData', () => {
    it('should verify user exists and queue GDPR export', async () => {
      adminService.getUserDetails.mockResolvedValue({ id: 'u1' } as any);
      activityService.requestDataExport.mockResolvedValue({
        exportId: 'export_1',
        status: 'processing',
      });
      const result = await controller.exportUserData('u1');
      expect(adminService.getUserDetails).toHaveBeenCalledWith('u1');
      expect(activityService.requestDataExport).toHaveBeenCalledWith('u1');
      expect(result.exportId).toBe('export_1');
    });
  });
});
