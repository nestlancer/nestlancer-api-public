import { mapToEmailJobs } from '../../src/email-job.mapper';
import { EmailJobType, isEmailJob } from '../../src/email-job.interface';

describe('mapToEmailJobs', () => {
  it('passes through normalized EmailJob payloads', () => {
    const job = {
      type: EmailJobType.WELCOME,
      to: 'user@test.com',
      data: { userName: 'Ada' },
    };
    expect(isEmailJob(job)).toBe(true);
    expect(mapToEmailJobs('email.welcome', job)).toEqual([job]);
  });

  it('maps contact response legacy payload', () => {
    const jobs = mapToEmailJobs('email.contact-response', {
      email: 'visitor@test.com',
      name: 'Visitor',
      subject: 'Re: Hello',
      message: 'Thanks',
      ticketId: 'TKT-1',
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].type).toBe(EmailJobType.CONTACT_RESPONSE);
    expect(jobs[0].to).toBe('visitor@test.com');
    expect(jobs[0].senderProfile).toBe('support');
  });

  it('maps password reset outbox payload', () => {
    process.env.FRONTEND_URL = 'https://app.test';
    const jobs = mapToEmailJobs('auth.password.reset_requested', {
      email: 'user@test.com',
      firstName: 'Ada',
      resetToken: 'reset_abc',
    });
    expect(jobs[0].type).toBe(EmailJobType.PASSWORD_RESET);
    expect(jobs[0].data.resetUrl).toContain('reset_abc');
  });
});
