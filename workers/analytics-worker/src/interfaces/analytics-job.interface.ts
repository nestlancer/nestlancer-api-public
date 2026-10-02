export enum AnalyticsJobType {
  USER_STATS = 'USER_STATS',
  PROJECT_STATS = 'PROJECT_STATS',
  REVENUE_REPORT = 'REVENUE_REPORT',
  PORTFOLIO_ANALYTICS = 'PORTFOLIO_ANALYTICS',
  BLOG_ANALYTICS = 'BLOG_ANALYTICS',
  ENGAGEMENT_METRICS = 'ENGAGEMENT_METRICS',
}

export enum Period {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export enum ExportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
}

export interface AnalyticsJob {
  type: AnalyticsJobType;
  period: Period;
  from?: Date;
  to?: Date;
  format?: ExportFormat;
}
