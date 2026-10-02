import { NotificationJobType } from '@nestlancer/common';

import { mapToNotificationJobs } from '../../src/notification-job.mapper';

describe('mapToNotificationJobs', () => {
  const adminIds = ['admin-1', 'admin-2'];
  const ctx = {
    frontendUrl: 'https://app.test',
    adminUrl: 'https://admin.test',
    adminIds,
  };

  it('maps request.request.submitted to admin notifications', () => {
    const jobs = mapToNotificationJobs(
      'request.request.submitted',
      {
        requestId: 'req-1',
        category: 'Web',
        submitterName: 'Jane Doe',
        requestTitle: 'Website redesign',
      },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].userId).toBe('admin-1');
    expect(jobs[0].notificationType).toBe('request.submitted');
    expect(jobs[0].notification.actionUrl).toBe('https://admin.test/requests/req-1');
    expect(jobs[0].type).toBe(NotificationJobType.IN_APP);
  });

  it('maps quote.quote.sent to user quote.received', () => {
    const jobs = mapToNotificationJobs(
      'quote.quote.sent',
      {
        quoteId: 'quote-1',
        userId: 'user-1',
        projectTitle: 'Website redesign',
        totalAmount: 12500000,
        currency: 'INR',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].userId).toBe('user-1');
    expect(jobs[0].notificationType).toBe('quote.received');
    expect(jobs[0].notification.title).toBe('New quote received');
    expect(jobs[0].notification.message).toContain('Website redesign');
    expect(jobs[0].idempotencyKey).toBe('quote.received:quote-1:user-1');
  });

  it('maps quote.quote.accepted to admin notifications', () => {
    const jobs = mapToNotificationJobs(
      'quote.quote.accepted',
      {
        quoteId: 'quote-1',
        clientName: 'Jane',
        projectTitle: 'Website redesign',
      },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs.every((j) => j.notificationType === 'quote.accepted')).toBe(true);
  });

  it('maps payment.payment.initiated to payment.due for client', () => {
    const jobs = mapToNotificationJobs(
      'payment.payment.initiated',
      {
        userId: 'user-1',
        projectId: 'proj-1',
        paymentId: 'pay-1',
        milestoneName: 'Design phase',
        amount: 500000,
        currency: 'INR',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('payment.due');
    expect(jobs[0].notification.title).toBe('Payment requested');
  });

  it('maps payment.payment.refunded to user notification', () => {
    const jobs = mapToNotificationJobs(
      'payment.payment.refunded',
      {
        paymentId: 'pay-1',
        userId: 'user-1',
        amount: 100000,
        currency: 'INR',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('payment.refunded');
  });

  it('maps PAYMENT_DISPUTED to admin notifications', () => {
    const jobs = mapToNotificationJobs(
      'payment.dispute.opened',
      { paymentId: 'pay-1', reason: 'Unauthorized charge' },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].notificationType).toBe('payment.disputeOpened');
  });

  it('maps EXPORT_COMPLETED to user for gdpr exports', () => {
    const jobs = mapToNotificationJobs(
      'export.job.completed',
      {
        exportType: 'gdpr',
        userId: 'user-1',
        exportId: 'exp-1',
        downloadUrl: 'https://cdn.test/export.zip',
        title: 'Your data export is ready',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('export.ready');
    expect(jobs[0].userId).toBe('user-1');
    expect(jobs[0].notification.actionUrl).toContain('/settings/account?downloadExport=exp-1');
    expect(jobs[0].notification.actionUrl).not.toContain('cdn.test');
  });

  it('maps EXPORT_COMPLETED project export to in-app download route', () => {
    const jobs = mapToNotificationJobs(
      'export.job.completed',
      {
        exportType: 'project',
        projectId: 'proj-1',
        exportId: 'export_proj-1_123',
        requestedByUserId: 'admin-1',
        downloadUrl: 'https://s3.test/exports/old.zip',
        title: 'Project export ready',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notification.actionUrl).toContain('/projects/proj-1?downloadExport=1');
    expect(jobs[0].notification.actionUrl).not.toContain('s3.test');
  });

  it('maps DOCUMENT_READY invoice to in-app payment route', () => {
    const jobs = mapToNotificationJobs(
      'document.generation.ready',
      {
        userId: 'user-1',
        documentType: 'INVOICE',
        entityId: 'pay-1',
        documentId: 'doc-1',
        downloadUrl: 'https://s3.test/invoices/pay-1.pdf?X-Amz-Signature=abc',
        title: 'Invoice ready',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notification.actionUrl).toContain('/payments/invoice/pay-1');
    expect(jobs[0].notification.actionUrl).not.toContain('s3.test');
  });

  it('includes the rupee amount in DOCUMENT_READY copy when the payload has one', () => {
    const jobs = mapToNotificationJobs(
      'DOCUMENT_READY',
      {
        userId: 'user-1',
        documentType: 'INVOICE',
        entityId: 'pay-1',
        documentId: 'doc-1',
        projectTitle: 'B2B Wholesale Ordering Portal',
        amount: 2950000,
        currency: 'INR',
        title: 'Invoice',
      },
      ctx,
    );
    expect(jobs[0].notification.message).toContain('₹29,500.00');
    expect(jobs[0].notification.message).toContain('B2B Wholesale Ordering Portal');
  });

  it('maps DELIVERABLE_UPLOADED to user deliverable.ready', () => {
    const jobs = mapToNotificationJobs(
      'progress.deliverable.uploaded',
      {
        userId: 'user-1',
        projectId: 'proj-1',
        projectTitle: 'Website',
        deliverableId: 'del-1',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('deliverable.ready');
  });

  it('maps message.message.sent to project chat recipient with admin URL', () => {
    const jobs = mapToNotificationJobs(
      'message.message.sent',
      {
        messageId: 'msg-1',
        projectId: 'proj-1',
        senderId: 'client-1',
        recipientId: 'admin-1',
        projectTitle: 'Website redesign',
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('message.new');
    expect(jobs[0].notification.actionUrl).toBe('https://admin.test/messages/project/proj-1');
  });

  it('maps message.message.flagged to admin moderation notifications', () => {
    const jobs = mapToNotificationJobs(
      'message.message.flagged',
      { messageId: 'msg-1', projectId: 'proj-1' },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].notificationType).toBe('message.flagged');
    expect(jobs[0].notification.actionUrl).toBe('https://admin.test/messages/flagged');
  });

  it('maps contact.inquiry.received to admin contact.inquiry notifications', () => {
    const jobs = mapToNotificationJobs(
      'contact.inquiry.received',
      { contactId: 'c-1', ticketId: 'TKT-1', name: 'Jane', subject: 'Support' },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].notificationType).toBe('contact.inquiry');
  });

  it('maps contact.response.sent to registered user contact.replied', () => {
    const jobs = mapToNotificationJobs(
      'contact.response.sent',
      { contactId: 'c-1', userId: 'user-1', ticketId: 'TKT-1' },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('contact.replied');
    expect(jobs[0].userId).toBe('user-1');
  });

  it('maps blog.comment.created PENDING status to comment.pending for admins', () => {
    const jobs = mapToNotificationJobs(
      'blog.comment.created',
      { commentId: 'cmt-1', postId: 'post-1', status: 'PENDING', postTitle: 'Launch post' },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].notificationType).toBe('comment.pending');
  });

  it('maps progress.revision.requested to admin revision.requested', () => {
    const jobs = mapToNotificationJobs(
      'progress.revision.requested',
      { milestoneId: 'ms-1', projectId: 'proj-1', name: 'Design', reason: 'Colors off' },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].notificationType).toBe('revision.requested');
  });

  it('maps MILESTONE_COMPLETED with wasRevision to client revision.completed', () => {
    const jobs = mapToNotificationJobs(
      'progress.milestone.completed',
      {
        milestoneId: 'ms-1',
        projectId: 'proj-1',
        name: 'Design',
        clientId: 'user-1',
        wasRevision: true,
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('revision.completed');
    expect(jobs[0].userId).toBe('user-1');
  });

  it('maps quote.quote.expiring to user quote.expiring', () => {
    const jobs = mapToNotificationJobs(
      'quote.quote.expiring',
      { quoteId: 'q-1', userId: 'user-1', quoteTitle: 'Website quote' },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('quote.expiring');
  });

  it('maps media.media.quarantined to admins and uploader', () => {
    const jobs = mapToNotificationJobs(
      'media.media.quarantined',
      { mediaId: 'm-1', uploaderId: 'user-1', filename: 'bad.exe', virusName: 'EICAR' },
      ctx,
    );
    expect(jobs).toHaveLength(3);
    expect(jobs.filter((j) => j.notificationType === 'media.quarantined')).toHaveLength(3);
  });

  it('maps user.security.force_reset to account.forcePasswordReset', () => {
    const jobs = mapToNotificationJobs('user.security.force_reset', { userId: 'user-1' }, ctx);
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('account.forcePasswordReset');
    expect(jobs[0].priority).toBe('CRITICAL');
  });

  it('maps user.account.deletion_scheduled to user and admins', () => {
    const jobs = mapToNotificationJobs(
      'user.account.deletion_scheduled',
      { userId: 'user-1', deletionDate: '2026-07-01' },
      ctx,
    );
    expect(jobs).toHaveLength(3);
    expect(jobs[0].userId).toBe('user-1');
    expect(jobs[1].notificationType).toBe('account.deletionScheduled');
  });

  it('maps webhook.delivery.failed to admin notifications', () => {
    const jobs = mapToNotificationJobs(
      'webhook.delivery.failed',
      { webhookId: 'wh-1', event: 'payment.completed' },
      ctx,
    );
    expect(jobs).toHaveLength(2);
    expect(jobs[0].notificationType).toBe('webhook.deliveryFailed');
  });

  it('maps MILESTONE_APPROVED with deemedAccept to milestone.deemedApproved', () => {
    const jobs = mapToNotificationJobs(
      'progress.milestone.approved',
      {
        milestoneId: 'ms-1',
        projectId: 'proj-1',
        name: 'Design',
        clientId: 'user-1',
        deemedAccept: true,
      },
      ctx,
    );
    expect(jobs).toHaveLength(1);
    expect(jobs[0].notificationType).toBe('milestone.deemedApproved');
  });

  it('returns empty array for unknown routing keys', () => {
    expect(mapToNotificationJobs('unknown.event', { foo: 'bar' }, ctx)).toEqual([]);
  });
});
