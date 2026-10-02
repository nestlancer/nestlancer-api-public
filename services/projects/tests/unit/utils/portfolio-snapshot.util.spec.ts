import {
  buildCaseStudyMarkdown,
  sanitizePublicText,
  slugifyTitle,
} from '../../../src/utils/portfolio-snapshot.util';

describe('portfolio-snapshot.util', () => {
  it('sanitizes email and phone from text', () => {
    const result = sanitizePublicText('Contact admin@test.com or +1 555-123-4567');
    expect(result).not.toContain('admin@test.com');
    expect(result).toContain('[redacted]');
  });

  it('slugifies titles', () => {
    expect(slugifyTitle('HealthTech Dashboard!')).toBe('healthtech-dashboard');
  });

  it('builds case study markdown with milestones', () => {
    const md = buildCaseStudyMarkdown({
      title: 'Test',
      description: 'A secure platform.',
      milestoneNames: ['Design', 'Build'],
    });
    expect(md).toContain('## Overview');
    expect(md).toContain('- Design');
  });
});
