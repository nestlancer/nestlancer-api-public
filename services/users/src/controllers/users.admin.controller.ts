import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiStandardResponse,
  ApiStandardResponses,
  ParseUuidPipe,
  UserRole,
  clampPagination,
} from '@nestlancer/common';
import { JwtAuthGuard, RolesGuard, Roles, CurrentUser } from '@nestlancer/auth-lib';
import { UsersAdminService } from '../services/users.admin.service';
import { ActivityService } from '../services/activity.service';
import { AdminUpdateUserDto } from '../dto/admin-update-user.dto';
import { AdminChangeRoleDto } from '../dto/admin-change-role.dto';
import { AdminChangeStatusDto } from '../dto/admin-change-status.dto';
import { AdminResetPasswordDto } from '../dto/admin-reset-password.dto';
import { AdminBulkOperationDto } from '../dto/admin-bulk-operation.dto';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';

/**
 * Administrative management of platform users. Requires ADMIN role (single admin model).
 */
@ApiTags('Admin/Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/users')
@ApiStandardResponses()
export class UsersAdminController {
  constructor(
    private readonly adminService: UsersAdminService,
    private readonly activityService: ActivityService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List all users (ADMIN only)' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiQuery({ name: 'status', required: false, example: 'ACTIVE' })
  @ApiQuery({ name: 'role', required: false, example: 'USER' })
  @ApiStandardResponse()
  async listUsers(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string,
    @Query('role') role?: string,
  ): Promise<any> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.listUsers(pageNum, limitNum, status, role);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search users' })
  @ApiQuery({ name: 'q', description: 'Search query string' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '20' })
  @ApiStandardResponse()
  async searchUsers(
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ): Promise<any> {
    if (!query || !query.trim()) {
      throw new BadRequestException('Query parameter "q" is required');
    }
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.searchUsers(query, pageNum, limitNum);
  }

  @Get('security-stats')
  @ApiOperation({ summary: 'Security statistics (users path alias)' })
  @ApiStandardResponse()
  async getUsersSecurityStatsAlias(): Promise<any> {
    return this.adminService.getSecurityStats();
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk user operations' })
  @ApiStandardResponse({ message: 'Bulk operation completed' })
  async bulkOperation(@Body() dto: AdminBulkOperationDto): Promise<any> {
    return this.adminService.bulkOperation(dto);
  }

  @Delete('sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate specific user session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  @ApiStandardResponse({ message: 'User session terminated successfully' })
  async terminateUserSession(@Param('sessionId') sessionId: string): Promise<any> {
    return this.adminService.terminateUserSession(sessionId);
  }

  /** Must be registered before @Get(':userId') so "logs" is not treated as a user id. */
  @Get('logs')
  @ApiOperation({ summary: 'List admin user-management audit logs' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '50' })
  @ApiStandardResponse()
  async getLogs(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ): Promise<any> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.getLogs(pageNum, limitNum, 'admin');
  }

  @Get('logs/security-stats')
  @ApiOperation({ summary: 'Get security statistics (users path)' })
  @ApiStandardResponse()
  async getSecurityStats(): Promise<any> {
    return this.adminService.getSecurityStats();
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse()
  async getUserDetails(@Param('userId', ParseUuidPipe) userId: string): Promise<any> {
    return this.adminService.getUserDetails(userId);
  }

  @Patch(':userId')
  @ApiOperation({ summary: 'Update user (Admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'User updated successfully' })
  async updateUser(
    @Param('userId', ParseUuidPipe) userId: string,
    @Body() dto: AdminUpdateUserDto,
    @CurrentUser('sub') adminId: string,
  ): Promise<any> {
    return this.adminService.updateUser(userId, dto, adminId);
  }

  @Patch(':userId/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'User role updated successfully' })
  async changeRole(
    @Param('userId', ParseUuidPipe) userId: string,
    @Body() dto: AdminChangeRoleDto,
    @CurrentUser('sub') adminId: string,
  ): Promise<any> {
    return this.adminService.changeRole(userId, dto.role, adminId);
  }

  @Patch(':userId/status')
  @ApiOperation({ summary: 'Change user status' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'User status updated successfully' })
  async changeUserStatus(
    @Param('userId', ParseUuidPipe) userId: string,
    @Body() dto: AdminChangeStatusDto,
    @CurrentUser('sub') adminId: string,
  ): Promise<any> {
    return this.adminService.changeUserStatus(userId, dto.status, adminId);
  }

  @Post(':userId/force-password-reset')
  @ApiOperation({ summary: 'Force password reset' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({
    message: 'Password reset forced. User will be required to change password on next login.',
  })
  async forcePasswordReset(
    @Param('userId', ParseUuidPipe) userId: string,
    @CurrentUser('sub') adminId: string,
  ): Promise<any> {
    return this.adminService.forcePasswordReset(userId, adminId);
  }

  @Post(':userId/reset-password')
  @ApiOperation({ summary: 'Manually reset password' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'Password reset successfully' })
  async adminResetPassword(
    @Param('userId', ParseUuidPipe) userId: string,
    @Body() dto: AdminResetPasswordDto,
    @CurrentUser('sub') adminId: string,
  ): Promise<any> {
    return this.adminService.adminResetPassword(userId, dto.newPassword, adminId);
  }

  @Get(':userId/sessions')
  @ApiOperation({ summary: 'Get user active sessions' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse()
  async getUserSessions(@Param('userId', ParseUuidPipe) userId: string): Promise<any> {
    return this.adminService.getUserSessions(userId);
  }

  @Post(':userId/terminate-all-sessions')
  @ApiOperation({ summary: 'Terminate all user sessions' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'All user sessions terminated' })
  async terminateAllUserSessions(@Param('userId', ParseUuidPipe) userId: string): Promise<any> {
    return this.adminService.terminateAllUserSessions(userId);
  }

  @Post(':userId/export')
  @ApiOperation({ summary: 'Trigger user data export (GDPR)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'Data export queued' })
  async exportUserData(@Param('userId', ParseUuidPipe) userId: string): Promise<any> {
    await this.adminService.getUserDetails(userId);
    return this.activityService.requestDataExport(userId);
  }

  @Get(':userId/activity')
  @ApiOperation({ summary: 'Get user activity log' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiQuery({ name: 'page', required: false, example: '1' })
  @ApiQuery({ name: 'limit', required: false, example: '50' })
  @ApiStandardResponse()
  async getUserActivity(
    @Param('userId', ParseUuidPipe) userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50',
  ): Promise<any> {
    const { page: pageNum, limit: limitNum } = clampPagination(page, limit);
    return this.adminService.getUserActivity(userId, pageNum, limitNum);
  }

  @Delete(':userId')
  @ApiOperation({ summary: 'Delete user account (soft delete)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'User deleted successfully' })
  async deleteUser(@Param('userId', ParseUuidPipe) userId: string): Promise<any> {
    return this.adminService.deleteUser(userId);
  }

  @Post(':userId/restore')
  @ApiOperation({ summary: 'Restore user account' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  @ApiStandardResponse({ message: 'User restored successfully' })
  async restoreUser(@Param('userId', ParseUuidPipe) userId: string): Promise<any> {
    return this.adminService.restoreUser(userId);
  }
}
