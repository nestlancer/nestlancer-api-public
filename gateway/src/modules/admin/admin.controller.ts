import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { Roles } from '@nestlancer/auth-lib';
import { ApiStandardResponses, Public, UserRole } from '@nestlancer/common';

import { HttpProxyService } from '../../proxy';

/**
 * Admin Gateway Controller
 * Routes admin requests to the Admin Service
 * All endpoints require admin authentication
 */
@Controller('admin')
@ApiTags('admin')
@ApiBearerAuth()
@ApiStandardResponses()
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly proxy: HttpProxyService) {}

  // --- Dashboard ---

  @Get('dashboard/overview')
  @ApiOperation({ summary: 'Get dashboard overview metrics' })
  async getDashboardOverview(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('dashboard/revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  async getRevenueAnalytics(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('dashboard/users')
  @ApiOperation({ summary: 'Get user metrics' })
  async getUserMetrics(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  /** PIPE-001: audit/app-map alias — passthrough so admin rewrite applies */
  @Get('dashboard/analytics/users')
  @ApiOperation({ summary: 'Get user analytics (alias of /dashboard/users)' })
  async getUserAnalyticsAlias(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('dashboard/projects')
  @ApiOperation({ summary: 'Get project metrics' })
  async getProjectMetrics(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  /** PIPE-001: audit/app-map alias — passthrough so admin rewrite applies */
  @Get('dashboard/analytics/projects')
  @ApiOperation({ summary: 'Get project analytics (alias of /dashboard/projects)' })
  async getProjectAnalyticsAlias(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  /** PIPE-001: top-level analytics alias used by some app-map probes */
  @Get('analytics/users')
  @ApiOperation({ summary: 'Get user analytics (alias of /dashboard/users)' })
  async getAnalyticsUsers(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/dashboard/users');
  }

  @Get('analytics/projects')
  @ApiOperation({ summary: 'Get project analytics (alias of /dashboard/projects)' })
  async getAnalyticsProjects(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/dashboard/projects');
  }

  @Get('dashboard/performance')
  @ApiOperation({ summary: 'Get system performance metrics' })
  async getPerformanceMetrics(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('dashboard/activity')
  @ApiOperation({ summary: 'Get recent activity' })
  async getRecentActivity(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('dashboard/alerts')
  @ApiOperation({ summary: 'Get system alerts' })
  async getSystemAlerts(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('reports')
  @ApiOperation({ summary: 'List generated analytics reports' })
  async listAnalyticsReports(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('reports')
  @ApiOperation({ summary: 'Generate an analytics report' })
  async generateAnalyticsReport(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('reports/:id/download')
  @ApiOperation({ summary: 'Download analytics report' })
  @ApiParam({ name: 'id', description: 'Report export UUID' })
  async downloadAnalyticsReport(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  // --- User Management ---

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async listUsers(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/search')
  @ApiOperation({ summary: 'Search users' })
  async searchUsers(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/:userId')
  @ApiOperation({ summary: 'Get user details' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async getUser(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Patch('users/:userId')
  @ApiOperation({ summary: 'Update user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async updateUser(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Patch('users/:userId/role')
  @ApiOperation({ summary: 'Change user role' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async changeUserRole(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Patch('users/:userId/status')
  @ApiOperation({ summary: 'Change account status' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async changeUserStatus(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('users/:userId/force-password-reset')
  @ApiOperation({ summary: 'Force password reset' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async forcePasswordReset(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('users/:userId/reset-password')
  @ApiOperation({ summary: 'Admin sets password' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async adminResetPassword(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/:userId/sessions')
  @ApiOperation({ summary: 'View user sessions' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async getUserSessions(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Delete('users/sessions/:sessionId')
  @ApiOperation({ summary: 'Terminate any session' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async terminateAnySession(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('users/:userId/terminate-all-sessions')
  @ApiOperation({ summary: 'End all user sessions' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async terminateAllUserSessions(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/:userId/activity')
  @ApiOperation({ summary: 'View user activity' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async getUserActivity(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Delete('users/:userId')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async deleteUser(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('users/:userId/restore')
  @ApiOperation({ summary: 'Restore deleted user' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async restoreUser(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('users/bulk')
  @ApiOperation({ summary: 'Bulk user operations' })
  async bulkUserOperations(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/logs')
  @ApiOperation({ summary: 'Admin audit logs' })
  async getUsersLogs(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/security-stats')
  @ApiOperation({ summary: 'Security metrics' })
  async getUsersSecurityStats(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('users/logs/security-stats')
  @ApiOperation({ summary: 'Security metrics (users logs path)' })
  async getUsersLogsSecurityStats(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  // --- Audit Logs ---

  @Get('logs')
  @ApiOperation({ summary: 'Auth audit logs' })
  async getAuditLogs(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Get('logs/security-stats')
  @ApiOperation({ summary: 'Security metrics' })
  async getSecurityStats(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('audit/export')
  @ApiOperation({ summary: 'Export audit logs (CSV/JSON)' })
  async exportAuditLogs(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('audit')
  @ApiOperation({ summary: 'List system audit logs (admin service)' })
  async listSystemAuditLogs(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  /** NL-BUG-USR-001: `/admin/audit/logs` must list, not hit `:id` with id="logs". */
  @Get('audit/logs')
  @ApiOperation({ summary: 'List system audit logs (logs alias)' })
  async listSystemAuditLogsAlias(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/v1/audit');
  }

  @Get('audit/stats')
  @ApiOperation({ summary: 'Audit log statistics' })
  async getAuditStats(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('audit/user/:userId')
  @ApiOperation({ summary: 'User audit trail' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async getUserAuditTrail(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('audit/resource/:type/:id')
  @ApiOperation({ summary: 'Resource audit trail' })
  @ApiParam({ name: 'type', description: 'Resource type' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getResourceAuditTrail(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('audit/:id')
  @ApiOperation({ summary: 'Get audit log entry by id' })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  async getAuditEntry(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  // --- System Configuration ---

  @Get('system/config')
  @ApiOperation({ summary: 'Get system configuration' })
  async getSystemConfig(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Patch('system/config')
  @ApiOperation({ summary: 'Update system configuration' })
  async updateSystemConfig(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  // --- Feature Flags (documented: GET /system/features + PATCH /system/features/:flag) ---

  @Get('system/features')
  @ApiOperation({ summary: 'List feature flags (doc path: features)' })
  async getSystemFeatures(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Patch('system/features/:flag')
  @ApiOperation({ summary: 'Toggle feature flag (doc param: flag)' })
  @ApiParam({ name: 'flag', description: 'Feature flag key' })
  async patchSystemFeature(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('system/jobs')
  @ApiOperation({ summary: 'List background jobs' })
  async getSystemJobs(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/jobs/:id/retry')
  @ApiOperation({ summary: 'Retry failed job' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async retrySystemJob(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Delete('system/jobs/:id')
  @ApiOperation({ summary: 'Cancel job' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async cancelSystemJob(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  // --- Email Templates ---

  @Get('system/email-templates')
  @ApiOperation({ summary: 'List email templates' })
  async getEmailTemplates(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/email-templates')
  @ApiOperation({ summary: 'Create or upsert email template by name' })
  async createEmailTemplate(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/email-templates/preview')
  @ApiOperation({ summary: 'Preview email template (collection alias)' })
  async previewEmailTemplateCollection(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('system/email-templates/:id')
  @ApiOperation({ summary: 'Get email template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getEmailTemplate(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Patch('system/email-templates/:id')
  @ApiOperation({ summary: 'Update email template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateEmailTemplate(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('system/email-templates/:id/preview')
  @ApiOperation({ summary: 'Preview email template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async previewEmailTemplate(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/email-templates/:id/test')
  @ApiOperation({ summary: 'Send test email' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async sendTestEmail(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/cache/clear')
  @ApiOperation({ summary: 'Clear all system cache' })
  async clearSystemCache(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/cache/clear/:key')
  @ApiOperation({ summary: 'Clear specific cache key' })
  @ApiParam({ name: 'key', description: 'Cache key' })
  async clearSystemCacheKey(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('system/logs')
  @ApiOperation({ summary: 'View system logs' })
  async getSystemLogs(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('system/logs/download')
  @ApiOperation({ summary: 'Download system logs' })
  async downloadSystemLogs(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/announcements')
  @ApiOperation({ summary: 'Send system announcement' })
  async sendSystemAnnouncement(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('system/maintenance')
  @ApiOperation({ summary: 'Toggle maintenance mode' })
  async toggleMaintenanceMode(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  // --- Additional Proxy Endpoints ---

  @Post('users/:userId/impersonate')
  @ApiOperation({ summary: 'Start impersonation session' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async startImpersonation(@Req() req: Request, @Param('userId') userId: string) {
    return this.proxy.forward('admin', req, undefined, `/api/users/${userId}/impersonate`);
  }

  @Post('users/:userId/export')
  @ApiOperation({ summary: 'Export user data' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async exportUserData(@Req() req: Request) {
    return this.proxy.forward('users', req);
  }

  @Post('users/impersonate/end/:sessionId')
  @ApiOperation({ summary: 'End impersonation' })
  @ApiParam({ name: 'sessionId', description: 'Session UUID' })
  async endImpersonation(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('impersonate/end')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'End impersonation session (documented path)' })
  async endImpersonationAlias(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/users/impersonate/end');
  }

  @Get('impersonate/sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List active impersonation sessions (documented path)' })
  async getImpersonationSessions(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/users/impersonate/sessions');
  }

  @Get('payments')
  @ApiOperation({ summary: 'List all payments (admin)' })
  async listAdminPayments(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Payment statistics (admin)' })
  async getPaymentStats(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/summary')
  @ApiOperation({ summary: 'Payment summary (alias for stats)' })
  async getPaymentSummary(@Req() req: Request) {
    return this.proxy.forward('payments', req, undefined, '/api/v1/admin/payments/stats');
  }

  @Get('payments/milestones')
  @ApiOperation({ summary: 'List payment milestones' })
  async listPaymentMilestones(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/milestones/:id')
  @ApiOperation({ summary: 'Get payment milestone details' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getPaymentMilestone(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/milestones/:id/mark-complete')
  @ApiOperation({
    summary: 'Mark milestone complete (deprecated)',
    deprecated: true,
    description:
      'Deprecated. Proxies to progress POST /admin/milestones/:id/complete. Use that path for new integrations.',
  })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async markMilestoneComplete(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward(
      'progress',
      req,
      undefined,
      `/api/v1/admin/milestones/${id}/complete`,
    );
  }

  @Post('payments/milestones/:id/request-payment')
  @ApiOperation({ summary: 'Request payment for milestone' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async requestMilestonePayment(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward(
      'payments',
      req,
      undefined,
      `/api/v1/admin/milestones/${id}/request-payment`,
    );
  }

  @Post('payments/milestones/:id/release')
  @ApiOperation({ summary: 'Confirm manual (offline) milestone payment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async releaseMilestonePayment(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward(
      'payments',
      req,
      undefined,
      `/api/v1/admin/payments/milestones/${id}/release`,
    );
  }

  @Post('payments/projects/:projectId/milestones')
  @ApiOperation({ summary: 'Create milestones for a project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async createProjectMilestones(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('payments/milestones/:id')
  @ApiOperation({ summary: 'Update a milestone' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateMilestone(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/disputes')
  @ApiOperation({ summary: 'List payment disputes' })
  async listPaymentDisputes(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/disputes/:id')
  @ApiOperation({ summary: 'Get dispute details' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getDisputeDetails(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('payments/disputes/:id')
  @ApiOperation({ summary: 'Update payment dispute (admin)' })
  @ApiParam({ name: 'id', description: 'Dispute UUID' })
  async updatePaymentDispute(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/disputes/:id/resolve')
  @ApiOperation({ summary: 'Resolve payment dispute (admin)' })
  @ApiParam({ name: 'id', description: 'Dispute UUID' })
  async resolvePaymentDispute(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/revenue/export')
  @ApiOperation({ summary: 'Export revenue data (CSV/JSON)' })
  async exportRevenue(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/:id/receipt')
  @ApiOperation({ summary: 'Download payment receipt PDF (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async getAdminPaymentReceipt(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/:id/documents/versions')
  @ApiOperation({ summary: 'List payment document versions (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async getAdminPaymentDocumentVersions(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/:id/invoice')
  @ApiOperation({ summary: 'Download payment invoice PDF (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async getAdminPaymentInvoice(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/reconciliation')
  @ApiOperation({ summary: 'Payment reconciliation' })
  async getReconciliation(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/revenue/report')
  @ApiOperation({ summary: 'Revenue report (admin)' })
  async getRevenueReport(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/methods/supported')
  @ApiOperation({ summary: 'Supported payment methods (admin)' })
  async getSupportedPaymentMethods(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/accounts')
  @ApiOperation({ summary: 'List platform payment accounts (admin)' })
  async listPlatformPaymentAccounts(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/accounts')
  @ApiOperation({ summary: 'Create platform payment account' })
  async createPlatformPaymentAccount(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('payments/accounts/:id')
  @ApiOperation({ summary: 'Update platform payment account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  async updatePlatformPaymentAccount(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Delete('payments/accounts/:id')
  @ApiOperation({ summary: 'Disable platform payment account' })
  @ApiParam({ name: 'id', description: 'Account UUID' })
  async deletePlatformPaymentAccount(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/company-legal')
  @ApiOperation({ summary: 'List company legal profiles (GSTIN/PAN/address)' })
  async listCompanyLegalProfiles(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/company-legal')
  @ApiOperation({ summary: 'Create company legal profile' })
  async createCompanyLegalProfile(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('payments/company-legal/:id')
  @ApiOperation({ summary: 'Update company legal profile' })
  @ApiParam({ name: 'id', description: 'Profile UUID' })
  async updateCompanyLegalProfile(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Delete('payments/company-legal/:id')
  @ApiOperation({ summary: 'Remove company legal profile' })
  @ApiParam({ name: 'id', description: 'Profile UUID' })
  async deleteCompanyLegalProfile(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/manual')
  @ApiOperation({ summary: 'Record manual payment (admin)' })
  async recordManualPayment(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/:id/manual-payment')
  @ApiOperation({ summary: 'Record manual payment by payment id (audit alias)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async recordManualPaymentById(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/projects/:projectId/reconcile-state')
  @ApiOperation({ summary: 'Reconcile milestone/progress from completed payments' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async reconcileProjectPaymentState(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/reconcile')
  @ApiOperation({ summary: 'Run payment reconciliation (admin)' })
  async runPaymentReconciliation(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Patch('payments/settings')
  @ApiOperation({ summary: 'Update payment settings (admin)' })
  async updatePaymentSettings(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/milestones/:id/payments')
  @ApiOperation({ summary: 'List payments for a milestone (admin)' })
  @ApiParam({ name: 'id', description: 'Milestone UUID' })
  async getMilestonePayments(@Req() req: Request, @Param('id') id: string) {
    return this.proxy.forward(
      'payments',
      req,
      undefined,
      `/api/v1/admin/milestones/${id}/payments`,
    );
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get payment details (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async getAdminPaymentDetails(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/:id/transactions')
  @ApiOperation({ summary: 'Payment transaction history (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async getPaymentTransactions(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Get('payments/:id/timeline')
  @ApiOperation({ summary: 'Payment timeline (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async getPaymentTimeline(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/:id/refund')
  @ApiOperation({ summary: 'Process a payment refund' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async processPaymentRefund(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/:id/cancel')
  @ApiOperation({ summary: 'Cancel a pending payment intent (admin)' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async cancelPayment(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/:id/verify')
  @ApiOperation({ summary: 'Verify a payment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async verifyPayment(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/:id/approve-transfer')
  @ApiOperation({ summary: 'Approve offline bank/UPI transfer' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async approveTransfer(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/:id/reject-transfer')
  @ApiOperation({ summary: 'Reject offline bank/UPI transfer' })
  @ApiParam({ name: 'id', description: 'Payment UUID' })
  async rejectTransfer(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('payments/disputes/:id/respond')
  @ApiOperation({ summary: 'Respond to dispute' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async respondDispute(@Req() req: Request) {
    return this.proxy.forward('payments', req);
  }

  @Post('messages/projects/:projectId/system')
  @ApiOperation({ summary: 'Broadcast system message' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async broadcastSystemMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages')
  @ApiOperation({ summary: 'List all platform messages (admin)' })
  async listAllMessages(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages/stats')
  @ApiOperation({ summary: 'Global messaging stats (admin)' })
  async getMessagingStats(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages/analytics')
  @ApiOperation({ summary: 'Messaging analytics (admin)' })
  async getMessagingAnalytics(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages/conversations')
  @ApiOperation({ summary: 'List all project conversations (admin)' })
  async listMessagingConversations(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages/project/:projectId')
  @ApiOperation({ summary: 'Get project message history (admin)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectMessages(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages/flagged')
  @ApiOperation({ summary: 'Get flagged messages' })
  async getFlaggedMessages(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('messages/moderation-history')
  @ApiOperation({ summary: 'List message moderation history' })
  async listModerationHistory(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('messages/flagged/:id/dismiss')
  @ApiOperation({ summary: 'Dismiss flagged message' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async dismissFlaggedMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Delete('messages/flagged/:id')
  @ApiOperation({ summary: 'Delete flagged message' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteFlaggedMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('messages/flagged/:id/escalate')
  @ApiOperation({ summary: 'Escalate flagged message' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async escalateFlaggedMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('messages/flagged/:id/restore')
  @ApiOperation({ summary: 'Restore moderated message' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async restoreFlaggedMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Delete('messages/:id')
  @ApiOperation({ summary: 'Force delete message (admin)' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async deleteMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Post('messages/:id/flag')
  @ApiOperation({ summary: 'Flag message for moderation (admin)' })
  @ApiParam({ name: 'id', description: 'Message UUID' })
  async flagMessage(@Req() req: Request) {
    return this.proxy.forward('messaging', req);
  }

  @Get('notifications')
  @ApiOperation({ summary: 'List all notifications (admin)' })
  async listAdminNotifications(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('notifications/stats')
  @ApiOperation({ summary: 'Get notification statistics (admin)' })
  async getAdminNotificationStats(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('notifications/delivery-report')
  @ApiOperation({ summary: 'Get notification delivery report (admin)' })
  async getAdminNotificationDeliveryReport(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('notifications/send')
  @ApiOperation({ summary: 'Send targeted notification (admin)' })
  async sendAdminNotification(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('notifications/broadcast')
  @ApiOperation({ summary: 'Broadcast notification to all users (admin)' })
  async broadcastAdminNotification(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('notifications/segment')
  @ApiOperation({ summary: 'Send notification to user segment (admin)' })
  async sendSegmentAdminNotification(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete('notifications/user/:userId')
  @ApiOperation({ summary: 'Clear notifications for a user (admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async clearUserNotifications(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('notifications/:id/resend')
  @ApiOperation({ summary: 'Resend notification (admin)' })
  @ApiParam({ name: 'id', description: 'Notification UUID' })
  async resendAdminNotification(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('templates')
  @ApiOperation({ summary: 'Get notification templates (legacy path)' })
  async getNotificationTemplates(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Get('notifications/templates')
  @ApiOperation({ summary: 'Get notification templates' })
  async getNotificationTemplatesCanonical(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('templates')
  @ApiOperation({ summary: 'Create notification template (legacy path)' })
  async createNotificationTemplate(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Post('notifications/templates')
  @ApiOperation({ summary: 'Create notification template' })
  async createNotificationTemplateCanonical(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: 'Update notification template (legacy path)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateNotificationTemplate(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch('notifications/templates/:id')
  @ApiOperation({ summary: 'Update notification template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateNotificationTemplateCanonical(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: 'Delete notification template (legacy path)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteNotificationTemplate(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete('notifications/templates/:id')
  @ApiOperation({ summary: 'Delete notification template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteNotificationTemplateCanonical(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Patch('notification-templates/:id')
  @ApiOperation({ summary: 'Update notification template (legacy hyphenated path)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateNotificationTemplateLegacy(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  @Delete('notification-templates/:id')
  @ApiOperation({ summary: 'Delete notification template (legacy hyphenated path)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteNotificationTemplateLegacy(@Req() req: Request) {
    return this.proxy.forward('notifications', req);
  }

  // --- Portfolio admin (service: /api/v1/admin/portfolio) ---

  @Get('portfolio')
  @ApiOperation({ summary: 'List portfolio items (admin)' })
  async listAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio')
  @ApiOperation({ summary: 'Create portfolio item (admin)' })
  async createAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/reorder')
  @ApiOperation({ summary: 'Reorder portfolio items' })
  async reorderAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/bulk-update')
  @ApiOperation({ summary: 'Bulk update portfolio items (admin)' })
  async bulkUpdateAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Get('portfolio/analytics')
  @ApiOperation({ summary: 'Portfolio global analytics' })
  async getPortfolioAnalytics(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Get('portfolio/analytics/:itemId')
  @ApiOperation({ summary: 'Portfolio item analytics' })
  @ApiParam({ name: 'itemId', description: 'Portfolio item UUID' })
  async getPortfolioItemAnalytics(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Get('portfolio/categories')
  @ApiOperation({ summary: 'List portfolio categories' })
  async listPortfolioCategories(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/categories')
  @ApiOperation({ summary: 'Create portfolio category' })
  async createPortfolioCategory(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Patch('portfolio/categories/:categoryId')
  @ApiOperation({ summary: 'Update portfolio category' })
  @ApiParam({ name: 'categoryId', description: 'Category UUID' })
  async updatePortfolioCategory(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Delete('portfolio/categories/:categoryId')
  @ApiOperation({ summary: 'Delete portfolio category' })
  @ApiParam({ name: 'categoryId', description: 'Category UUID' })
  async deletePortfolioCategory(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Get('portfolio/:id')
  @ApiOperation({ summary: 'Get portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Patch('portfolio/:id')
  @ApiOperation({ summary: 'Update portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async patchAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Delete('portfolio/:id')
  @ApiOperation({ summary: 'Delete portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/publish')
  @ApiOperation({ summary: 'Publish portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async publishAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async unpublishAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/archive')
  @ApiOperation({ summary: 'Archive portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async archiveAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async duplicateAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/toggle-featured')
  @ApiOperation({ summary: 'Toggle featured status (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async toggleFeaturedAdminPortfolio(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Get('portfolio/:id/media')
  @ApiOperation({ summary: 'List portfolio preview media (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  async listAdminPortfolioMedia(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/media/upload')
  @ApiOperation({ summary: 'Upload portfolio preview media (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  async uploadAdminPortfolioMedia(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/media')
  @ApiOperation({ summary: 'Attach media to portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  async attachAdminPortfolioMedia(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/media/:mediaId/thumbnail')
  @ApiOperation({ summary: 'Set portfolio thumbnail image (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  async setAdminPortfolioThumbnail(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Post('portfolio/:id/media/:mediaId/featured-video')
  @ApiOperation({ summary: 'Set featured showcase video (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  async setAdminPortfolioFeaturedVideo(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Delete('portfolio/:id/media/:mediaId')
  @ApiOperation({ summary: 'Remove media from portfolio item (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  @ApiParam({ name: 'mediaId', description: 'Media UUID' })
  async deleteAdminPortfolioMedia(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Patch('portfolio/:id/media/reorder')
  @ApiOperation({ summary: 'Reorder portfolio item media (admin)' })
  @ApiParam({ name: 'id', description: 'Portfolio item UUID' })
  async reorderAdminPortfolioMedia(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  @Patch('portfolio/:id/privacy')
  @ApiOperation({ summary: 'Update portfolio item privacy (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async patchAdminPortfolioPrivacy(@Req() req: Request) {
    return this.proxy.forward('portfolio', req);
  }

  // --- Blog admin (service: /api/v1/admin/posts, /api/v1/admin/comments) ---

  @Get('blog/analytics')
  @ApiOperation({ summary: 'Blog analytics (admin)' })
  async getBlogAnalytics(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('blog/analytics/engagement')
  @ApiOperation({ summary: 'Blog engagement analytics (admin)' })
  async getBlogEngagementAnalytics(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('blog/analytics/top-posts')
  @ApiOperation({ summary: 'Top blog posts analytics (admin)' })
  async getBlogTopPostsAnalytics(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('blog/analytics/:id')
  @ApiOperation({ summary: 'Blog post analytics (admin)' })
  @ApiParam({ name: 'id', description: 'Post UUID' })
  async getBlogPostAnalytics(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('posts')
  @ApiOperation({ summary: 'List blog posts (admin)' })
  async listAdminBlogPosts(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts')
  @ApiOperation({ summary: 'Create blog post (admin)' })
  async createAdminBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/export')
  @ApiOperation({ summary: 'Export blog posts (JSON)' })
  async exportAdminBlogPosts(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/import')
  @ApiOperation({ summary: 'Import blog posts (JSON)' })
  async importAdminBlogPosts(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('posts/:id')
  @ApiOperation({ summary: 'Get blog post by id (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('posts/:id')
  @ApiOperation({ summary: 'Update blog post (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async patchAdminBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Delete blog post (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteAdminBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/publish')
  @ApiOperation({ summary: 'Publish blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async publishBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/feature')
  @ApiOperation({ summary: 'Feature blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async featureBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/unfeature')
  @ApiOperation({ summary: 'Unfeature blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async unfeatureBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/unpublish')
  @ApiOperation({ summary: 'Unpublish blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async unpublishBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/pin')
  @ApiOperation({ summary: 'Pin blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async pinBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/schedule')
  @ApiOperation({ summary: 'Schedule blog post publication' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async scheduleBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/unpin')
  @ApiOperation({ summary: 'Unpin blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async unpinBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate blog post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async duplicateBlogPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('posts/settings')
  @ApiOperation({ summary: 'Update blog post settings (admin)' })
  async patchBlogPostSettings(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('comments')
  @ApiOperation({ summary: 'List blog comments (admin)' })
  async listAdminBlogComments(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('comments/pending')
  @ApiOperation({ summary: 'List pending blog comments (admin)' })
  async listPendingBlogComments(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('comments/:id/approve')
  @ApiOperation({ summary: 'Approve blog comment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async approveBlogComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('comments/:id/approve')
  @ApiOperation({ summary: 'Approve blog comment (POST alias)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async approveBlogCommentPost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Delete blog comment (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteBlogComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/archive')
  @ApiOperation({ summary: 'Archive post' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async archivePost(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('posts/:id/revisions')
  @ApiOperation({ summary: 'Get post revisions' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getPostRevisions(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('posts/:id/revisions/:revisionId/restore')
  @ApiOperation({ summary: 'Restore post revision' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiParam({ name: 'revisionId', description: 'Revision UUID' })
  async restorePostRevision(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('comments/reported')
  @ApiOperation({ summary: 'Get reported comments' })
  async getReportedComments(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('comments/:id/reject')
  @ApiOperation({ summary: 'Reject comment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async rejectComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('comments/:id/reject')
  @ApiOperation({ summary: 'Reject comment (PATCH alias)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async rejectCommentPatch(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('comments/:id/spam')
  @ApiOperation({ summary: 'Mark comment as spam' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async markCommentSpam(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('comments/:id/spam')
  @ApiOperation({ summary: 'Mark comment as spam (PATCH alias)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async markCommentSpamPatch(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('comments/:id/pin')
  @ApiOperation({ summary: 'Pin comment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async pinComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('comments/:id/unpin')
  @ApiOperation({ summary: 'Unpin comment' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async unpinComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('comments/:id/reply')
  @ApiOperation({ summary: 'Reply to comment (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async replyToComment(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('blog/categories')
  @ApiOperation({ summary: 'List blog categories (admin)' })
  async listBlogCategories(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('blog/categories')
  @ApiOperation({ summary: 'Create blog category (admin)' })
  async createBlogCategory(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('blog/categories/:id')
  @ApiOperation({ summary: 'Update blog category (admin)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  async updateBlogCategory(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Delete('blog/categories/:id')
  @ApiOperation({ summary: 'Delete blog category (admin)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  async deleteBlogCategory(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('blog/categories/merge')
  @ApiOperation({ summary: 'Merge blog categories (admin)' })
  async mergeBlogCategories(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('blog/tags')
  @ApiOperation({ summary: 'Create tag' })
  async createTag(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('blog/tags')
  @ApiOperation({ summary: 'List blog tags (admin)' })
  async listBlogTags(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Patch('blog/tags/:id')
  @ApiOperation({ summary: 'Update blog tag (admin)' })
  @ApiParam({ name: 'id', description: 'Tag UUID' })
  async updateBlogTag(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Delete('blog/tags/:id')
  @ApiOperation({ summary: 'Delete blog tag (admin)' })
  @ApiParam({ name: 'id', description: 'Tag UUID' })
  async deleteBlogTag(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Post('blog/tags/merge')
  @ApiOperation({ summary: 'Merge tags' })
  async mergeTags(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('blog/authors')
  @ApiOperation({ summary: 'Get authors' })
  async getAuthors(@Req() req: Request) {
    return this.proxy.forward('blog', req);
  }

  @Get('projects')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all projects (admin)' })
  async listAdminProjects(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/stats')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project stats' })
  async getProjectStats(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id/duplicate-preview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview project as duplicate template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getProjectDuplicatePreview(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id/portfolio-link')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked portfolio status for a project' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getProjectPortfolioLink(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id/portfolio-preview')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Preview portfolio draft from completed project' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getProjectPortfolioPreview(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/create-portfolio-draft')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create portfolio draft from completed project' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async createPortfolioDraftFromProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/from-template')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create draft quote from project template' })
  async createProjectFromTemplate(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project details (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Patch('projects/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update project (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateAdminProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Patch('projects/:id/status')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Override project status (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateAdminProjectStatus(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id/status-history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Project status change history (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminProjectStatusHistory(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/archive')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive project' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async archiveProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/extend')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Extend project deadline (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async extendProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/duplicate')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Duplicate project as template' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async duplicateProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/unarchive')
  @ApiOperation({ summary: 'Unarchive project' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async unarchiveProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/export')
  @ApiOperation({ summary: 'Export project' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async exportProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id/export/download')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download latest project export (fresh signed URL)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async downloadProjectExport(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Post('projects/:id/team')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add team member to project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async addProjectTeamMember(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Delete('projects/:id/team/:memberId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove team member from project' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  @ApiParam({ name: 'memberId', description: 'Team member user UUID' })
  async removeProjectTeamMember(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Get('projects/:id/analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get project analytics' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async getProjectAnalytics(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  @Delete('projects/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete project (admin)' })
  @ApiParam({ name: 'id', description: 'Project UUID' })
  async deleteAdminProject(@Req() req: Request) {
    return this.proxy.forward('projects', req);
  }

  // --- Admin Progress Management (progress microservice) ---

  @Get('projects/:projectId/deliverables')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List deliverables for a project (admin)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async listProjectDeliverables(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Post('projects/:projectId/deliverables')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload deliverable for a project (admin)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async uploadProjectDeliverable(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Post('projects/:projectId/milestones')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a milestone for a project (admin)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async createProjectMilestone(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Patch('milestones/:milestoneId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a progress milestone (admin)' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone UUID' })
  async updateProgressMilestone(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Post('milestones/:milestoneId/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a milestone as complete (admin)' })
  @ApiParam({ name: 'milestoneId', description: 'Milestone UUID' })
  async completeMilestone(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Patch('deliverables/:deliverableId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update deliverable metadata (admin)' })
  @ApiParam({ name: 'deliverableId', description: 'Deliverable UUID' })
  async updateDeliverable(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Delete('deliverables/:deliverableId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a deliverable (admin)' })
  @ApiParam({ name: 'deliverableId', description: 'Deliverable UUID' })
  async deleteDeliverable(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  // --- Admin Progress (progress microservice: /api/v1/admin/progress/...) ---

  @Get('progress/projects/:projectId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List progress entries for project (admin)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async listAdminProgressEntries(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Post('progress/projects/:projectId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create progress entry (admin)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async createAdminProgressEntry(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Get('progress/projects/:projectId/timeline')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Admin progress timeline' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getAdminProgressTimeline(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Patch('progress/projects/:projectId/status')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Update project status via progress admin (deprecated — prefer PATCH projects/:id/status)',
  })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async updateProgressAdminProjectStatus(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Post('progress/projects/:projectId/complete')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark project complete (admin progress)' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async markAdminProjectComplete(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Get('progress/projects/:projectId/analytics')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get progress analytics for project' })
  @ApiParam({ name: 'projectId', description: 'Project UUID' })
  async getProjectProgressAnalytics(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Patch('progress/:entryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update progress entry (admin)' })
  @ApiParam({ name: 'entryId', description: 'Progress entry UUID' })
  async updateAdminProgressEntry(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  @Delete('progress/:entryId')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete progress entry (admin)' })
  @ApiParam({ name: 'entryId', description: 'Progress entry UUID' })
  async deleteAdminProgressEntry(@Req() req: Request) {
    return this.proxy.forward('progress', req, undefined, req.path);
  }

  // --- Admin Requests (requests microservice) ---

  @Get('requests')
  @ApiOperation({ summary: 'List all project requests (admin)' })
  async listAdminRequests(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('requests/stats')
  @ApiOperation({ summary: 'Get platform request statistics (admin)' })
  async getAdminRequestStats(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('requests/capacity')
  @ApiOperation({ summary: 'Admin capacity dashboard (alias)' })
  async getCapacityDashboardAlias(@Req() req: Request) {
    return this.proxy.forward('requests', req, undefined, '/api/v1/admin/requests/capacity/dashboard');
  }

  @Get('requests/capacity/dashboard')
  @ApiOperation({ summary: 'Admin capacity dashboard' })
  async getCapacityDashboard(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Patch('requests/settings/capacity')
  @ApiOperation({ summary: 'Update admin capacity settings' })
  async updateCapacitySettings(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('requests/:id')
  @ApiOperation({ summary: 'Get request details (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminRequest(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Patch('requests/:id/status')
  @ApiOperation({ summary: 'Update request status (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateAdminRequestStatus(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post('requests/:id/quotes')
  @ApiOperation({ summary: 'Create quote from request (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async createAdminRequestQuote(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post('requests/:id/quotes/prefill')
  @ApiOperation({ summary: 'Get quote prefill suggestions from a past quote (admin)' })
  @ApiParam({ name: 'id', description: 'Target request UUID' })
  async suggestAdminRequestQuotePrefill(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post('requests/:id/notes')
  @ApiOperation({ summary: 'Add internal note to request (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async addAdminRequestNote(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('requests/:id/notes')
  @ApiOperation({ summary: 'List internal notes for request (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async listAdminRequestNotes(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Patch('requests/:id')
  @ApiOperation({ summary: 'Update request details (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async patchAdminRequest(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post('requests/:id/assign')
  @ApiOperation({ summary: 'Assign request to staff (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async assignAdminRequest(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Delete('requests/:id')
  @ApiOperation({ summary: 'Soft-delete request (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteAdminRequest(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('requests/:id/attachments/:attachmentId/download')
  @ApiOperation({ summary: 'Get presigned download URL for request attachment (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  @ApiParam({ name: 'attachmentId', description: 'Attachment UUID' })
  async getAdminRequestAttachmentDownload(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  // --- Admin Quotes (quotes microservice) ---

  @Get('quotes')
  @ApiOperation({ summary: 'List all quotes (admin)' })
  async listAdminQuotes(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/stats')
  @ApiOperation({ summary: 'Get platform quote statistics (admin)' })
  async getAdminQuoteStats(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes')
  @ApiOperation({ summary: 'Create standalone quote (admin)' })
  async createAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/:id/send')
  @ApiOperation({ summary: 'Send quote to client (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async sendAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/:id')
  @ApiOperation({ summary: 'Get quote details (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Patch('quotes/:id')
  @ApiOperation({ summary: 'Update quote (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async patchAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Delete('quotes/:id')
  @ApiOperation({ summary: 'Delete quote (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/:id/duplicate')
  @ApiOperation({ summary: 'Duplicate quote (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async duplicateAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/:id/revise')
  @ApiOperation({ summary: 'Revise quote (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async reviseAdminQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/:id/history')
  @ApiOperation({ summary: 'Get quote history (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminQuoteHistory(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/:id/documents/versions')
  @ApiOperation({ summary: 'List quote document versions (admin)' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async getAdminQuoteDocumentVersions(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/:id/pdf')
  @ApiOperation({ summary: 'Get quote PDF metadata (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminQuotePdf(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/:id/contract')
  @ApiOperation({ summary: 'Download signed contract PDF (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getAdminQuoteContract(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/templates')
  @ApiOperation({ summary: 'List quote templates (deprecated)', deprecated: true })
  async getAdminQuoteTemplates(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/line-item-library')
  @ApiOperation({ summary: 'List reusable quote line-item blocks' })
  async getQuoteLineItemLibrary(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/line-item-library')
  @ApiOperation({ summary: 'Create a line-item library block' })
  async createQuoteLineItemBlock(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Patch('quotes/line-item-library/:id')
  @ApiOperation({ summary: 'Update a line-item library block' })
  @ApiParam({ name: 'id', description: 'Block UUID' })
  async updateQuoteLineItemBlock(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Delete('quotes/line-item-library/:id')
  @ApiOperation({ summary: 'Deactivate a line-item library block' })
  @ApiParam({ name: 'id', description: 'Block UUID' })
  async deactivateQuoteLineItemBlock(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('quotes/payment-schedule-presets')
  @ApiOperation({ summary: 'List payment schedule presets for quote creation' })
  async getPaymentSchedulePresets(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/templates')
  @ApiOperation({ summary: 'Create quote template (removed)', deprecated: true })
  async createAdminQuoteTemplate(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/:id/resend')
  @ApiOperation({ summary: 'Resend quote notification' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async resendQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Post('quotes/:id/extend')
  @ApiOperation({ summary: 'Extend quote validity' })
  @ApiParam({ name: 'id', description: 'Quote UUID' })
  async extendQuote(@Req() req: Request) {
    return this.proxy.forward('quotes', req);
  }

  @Get('service-packages')
  @ApiOperation({ summary: 'List service catalog packages (admin)' })
  async listServicePackages(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Post('service-packages')
  @ApiOperation({ summary: 'Create or upsert a service catalog package' })
  async upsertServicePackage(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Patch('service-packages/:id')
  @ApiOperation({ summary: 'Update a service catalog package' })
  @ApiParam({ name: 'id', description: 'Package UUID' })
  async updateServicePackage(@Req() req: Request) {
    return this.proxy.forward('requests', req);
  }

  @Get('time-entries')
  @ApiOperation({ summary: 'List admin time entries' })
  async listTimeEntries(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Post('time-entries')
  @ApiOperation({ summary: 'Log admin time entry for a milestone' })
  async createTimeEntry(@Req() req: Request) {
    return this.proxy.forward('progress', req);
  }

  @Get('webhooks/health')
  @ApiOperation({ summary: 'Webhooks admin health' })
  async webhooksHealth(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('webhooks/events')
  @ApiOperation({ summary: 'List available webhook events' })
  async webhooksEvents(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('webhooks')
  @ApiOperation({ summary: 'List configured outgoing webhooks' })
  async listWebhooks(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('webhooks')
  @ApiOperation({ summary: 'Register outgoing webhook' })
  async createWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('webhooks/:id')
  @ApiOperation({ summary: 'Get webhook configuration' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Patch('webhooks/:id')
  @ApiOperation({ summary: 'Update webhook configuration' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async patchWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Delete('webhooks/:id')
  @ApiOperation({ summary: 'Delete webhook configuration' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('webhooks/:id/test')
  @ApiOperation({ summary: 'Send test webhook delivery' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async testWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('webhooks/:id/deliveries')
  @ApiOperation({ summary: 'Webhook delivery history' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async webhookDeliveries(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('webhooks/:id/enable')
  @ApiOperation({ summary: 'Enable webhook' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async enableWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Post('webhooks/:id/disable')
  @ApiOperation({ summary: 'Disable webhook' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async disableWebhook(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  // --- Admin Contact ---

  @Get('contact')
  @ApiOperation({ summary: 'List contact messages (admin)' })
  async listContactMessages(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Get('contact/:id')
  @ApiOperation({ summary: 'Get contact message details (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async getContactMessage(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Patch('contact/:id/status')
  @ApiOperation({ summary: 'Update contact message status (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async updateContactStatus(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Post('contact/:id/respond')
  @ApiOperation({ summary: 'Respond to contact message (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async respondToContact(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Post('contact/:id/spam')
  @ApiOperation({ summary: 'Mark contact message as spam (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async markContactSpam(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Delete('contact/:id')
  @ApiOperation({ summary: 'Delete contact message (admin)' })
  @ApiParam({ name: 'id', description: 'Resource UUID' })
  async deleteContactMessage(@Req() req: Request) {
    return this.proxy.forward('contact', req);
  }

  @Get('documents/verify/:documentNumber')
  @ApiOperation({ summary: 'Verify document by number (admin)' })
  @ApiParam({ name: 'documentNumber', description: 'Document reference number' })
  async verifyDocument(@Req() req: Request) {
    return this.proxy.forward('admin', req);
  }

  @Get('documents/users/:userId')
  @ApiOperation({ summary: 'List generated documents for a user (admin)' })
  @ApiParam({ name: 'userId', description: 'User UUID' })
  async listUserDocuments(@Req() req: Request) {
    return this.proxy.forward(
      'admin',
      req,
      undefined,
      `/api/documents/users/${req.params.userId}`,
    );
  }

  @Get('documents/:documentId/download')
  @ApiOperation({ summary: 'Download a specific generated document version (admin)' })
  @ApiParam({ name: 'documentId', description: 'GeneratedDocument UUID' })
  async downloadGeneratedDocument(@Req() req: Request) {
    return this.proxy.forward(
      'admin',
      req,
      undefined,
      `/api/documents/${req.params.documentId}/download`,
    );
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Admin service health check' })
  async health(@Req() req: Request) {
    return this.proxy.forward('admin', req, undefined, '/api/health');
  }
}
