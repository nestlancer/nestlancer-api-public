/**
 * Different types of analytics jobs supported by the worker.
 */
export enum AnalyticsJobType {
  /** Statistics related to user growth and activity */
  USER_STATS = 'USER_STATS',
  /** Statistics related to project volume and completion */
  PROJECT_STATS = 'PROJECT_STATS',
  /** Financial reporting and revenue tracking */
  REVENUE_REPORT = 'REVENUE_REPORT',
  /** Analytics for user portfolios and showcases */
  PORTFOLIO_ANALYTICS = 'PORTFOLIO_ANALYTICS',
  /** Traffic and engagement analytics for blogs */
  BLOG_ANALYTICS = 'BLOG_ANALYTICS',
  /** General user engagement and retention metrics */
  ENGAGEMENT_METRICS = 'ENGAGEMENT_METRICS',
}

/**
 * Time periods supported for data aggregation.
 */
export enum Period {
  HOURLY = 'HOURLY',
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

/**
 * Supported file formats for exporting analytics reports.
 */
export enum ExportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
}

/**
 * Represents an analytics processing job payload.
 */
export interface AnalyticsJob {
  /** The specific analytics module to execute */
  type: AnalyticsJobType;
  /** The granularity of the report */
  period: Period;
  /** Optional start date for the aggregation window */
  from?: Date;
  /** Optional end date for the aggregation window */
  to?: Date;
  /** Optional export format if the job is for report generation */
  format?: ExportFormat;
}

/**
 * Represents the result of an analytics aggregation process.
 */
export interface AggregationResult {
  /** The type of analytics that was performed */
  type: AnalyticsJobType;
  /** The time period over which the data was aggregated */
  period: Period;
  /** The actual aggregated data points */
  data: Record<string, any>;
  /** Timestamp of when this result was generated */
  generatedAt: Date;
  /** Timestamp until which this result should be considered fresh in cache */
  cachedUntil: Date;
}
