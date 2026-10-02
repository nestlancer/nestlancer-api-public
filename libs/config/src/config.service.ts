import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class NestlancerConfigService {
  constructor(private readonly configService: ConfigService) {}

  get<T = string>(key: string): T {
    return this.configService.getOrThrow<T>(key);
  }

  getOptional<T = string>(key: string, defaultValue?: T): T | undefined {
    return this.configService.get<T>(key) ?? defaultValue;
  }

  // ── General ──────────────────────────────────────────────
  get nodeEnv(): string {
    return this.get('NODE_ENV');
  }
  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }
  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }
  get isTest(): boolean {
    return this.nodeEnv === 'test';
  }
  get appName(): string {
    return this.getOptional('APP_NAME') || 'Nestlancer';
  }
  get apiVersion(): string {
    return this.getOptional('API_VERSION') || 'v1';
  }
  get port(): number {
    return Number(this.getOptional('GATEWAY_PORT') || 3000);
  }
  get frontendUrl(): string {
    return this.getOptional('FRONTEND_URL') || 'http://localhost:3000';
  }
  get logLevel(): string {
    return this.getOptional('LOG_LEVEL') || 'debug';
  }
  get logFormat(): string {
    return this.getOptional('LOG_FORMAT') || 'pretty';
  }

  // ── Database ─────────────────────────────────────────────
  get databaseUrl(): string {
    return this.get('DATABASE_URL');
  }
  get databaseReadUrl(): string {
    return this.getOptional('DATABASE_READ_URL') ?? this.databaseUrl;
  }
  get databasePoolMin(): number {
    return Number(this.getOptional('DATABASE_POOL_MIN') || 2);
  }
  get databasePoolMax(): number {
    return Number(this.getOptional('DATABASE_POOL_MAX') || 20);
  }

  // ── Redis ────────────────────────────────────────────────
  get redisCacheUrl(): string {
    return this.get('REDIS_CACHE_URL');
  }
  get redisPubSubUrl(): string {
    return this.getOptional('REDIS_PUBSUB_URL') ?? this.redisCacheUrl;
  }
  get redisCacheTtl(): number {
    return Number(this.getOptional('REDIS_CACHE_TTL_DEFAULT') || 300);
  }

  // ── RabbitMQ ─────────────────────────────────────────────
  get rabbitmqUrl(): string {
    return this.get('RABBITMQ_URL');
  }
  get rabbitmqPrefetch(): number {
    return Number(this.getOptional('RABBITMQ_PREFETCH') || 10);
  }
  get rabbitmqMaxRetries(): number {
    return Number(this.getOptional('RABBITMQ_MAX_RETRIES') || 3);
  }
  get rabbitmqRetryDelay(): number {
    return Number(this.getOptional('RABBITMQ_RETRY_DELAY') || 5000);
  }

  // ── JWT / Auth ───────────────────────────────────────────
  get jwtAccessSecret(): string {
    return this.get('JWT_ACCESS_SECRET');
  }
  get jwtRefreshSecret(): string {
    return this.get('JWT_REFRESH_SECRET');
  }
  get jwtAccessExpiration(): string {
    return this.getOptional('JWT_ACCESS_EXPIRATION') || '15m';
  }
  get jwtRefreshExpiration(): string {
    return this.getOptional('JWT_REFRESH_EXPIRATION') || '30d';
  }
  get jwtIssuer(): string {
    return this.getOptional('JWT_ISSUER') || 'localhost';
  }
  get jwtAudience(): string {
    return this.getOptional('JWT_AUDIENCE') || 'localhost';
  }

  // ── CORS ─────────────────────────────────────────────────
  get corsOrigins(): string[] {
    return (this.getOptional('CORS_ORIGINS') || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim());
  }
  get corsCredentials(): boolean {
    return this.getOptional('CORS_CREDENTIALS') === 'true';
  }
  get corsMaxAge(): number {
    return Number(this.getOptional('CORS_MAX_AGE') || 86400);
  }

  // ── Storage ──────────────────────────────────────────────
  get storageProvider(): string {
    return this.getOptional('STORAGE_PROVIDER') || 'local';
  }
  get s3AccessKeyId(): string {
    return this.getOptional('S3_ACCESS_KEY_ID') || '';
  }
  get s3SecretAccessKey(): string {
    return this.getOptional('S3_SECRET_ACCESS_KEY') || '';
  }
  /** Private/LAN S3 endpoint for server SDK calls (avoids public tunnel hairpin). */
  get s3LocalEndpoint(): string {
    return this.getOptional('S3_LOCAL_ENDPOINT') || '';
  }
  get s3Endpoint(): string {
    return this.getOptional('S3_ENDPOINT') || '';
  }
  get s3PublicEndpoint(): string {
    return (
      this.getOptional('S3_PUBLIC_ENDPOINT') ||
      this.getOptional('CDN_PUBLIC_BASE_URL') ||
      ''
    );
  }
  get cdnPublicBaseUrl(): string {
    return this.getOptional('CDN_PUBLIC_BASE_URL') || '';
  }
  get s3Region(): string {
    return this.getOptional('S3_REGION') || 'us-east-1';
  }
  get s3PresignedUrlExpiry(): number {
    return Number(this.getOptional('S3_PRESIGNED_URL_EXPIRY') || 900);
  }
  get storageMaxFileSize(): number {
    return Number(this.getOptional('STORAGE_MAX_FILE_SIZE') || 104857600);
  }
  get storageAllowedMimeTypes(): string[] {
    const value =
      this.getOptional('STORAGE_ALLOWED_MIME_TYPES') || 'image/jpeg,image/png,application/pdf';
    return value.split(',').map((t) => t.trim());
  }
  get localStoragePath(): string {
    return this.getOptional('LOCAL_STORAGE_PATH') || './data/storage';
  }
  get localStorageUrl(): string | undefined {
    return this.getOptional('LOCAL_STORAGE_URL');
  }

  // Canonical bucket accessors
  get storageBucketPrivate(): string {
    return this.getOptional('STORAGE_BUCKET_PRIVATE') || 'nestlancer-private';
  }

  get storageBucketPublic(): string {
    return this.getOptional('STORAGE_BUCKET_PUBLIC') || 'nestlancer-public';
  }

  get storageBucketAvatars(): string {
    return this.getOptional('STORAGE_BUCKET_AVATARS') || 'nestlancer-avatars';
  }

  get storageBucketAttachments(): string {
    return this.getOptional('STORAGE_BUCKET_ATTACHMENTS') || 'nestlancer-requests';
  }

  get storageBucketQuotes(): string {
    return this.getOptional('STORAGE_BUCKET_QUOTES') || 'nestlancer-quotes-pdfs';
  }

  get storageBucketDeliverables(): string {
    return this.getOptional('STORAGE_BUCKET_DELIVERABLES') || 'nestlancer-deliverables';
  }

  get storageBucketReports(): string {
    return this.getOptional('STORAGE_BUCKET_REPORTS') || 'nestlancer-reports';
  }

  get storageBucketPdfs(): string {
    return this.getOptional('STORAGE_BUCKET_PDFS') || 'nestlancer-pdfs';
  }

  // ── Email ────────────────────────────────────────────────
  get emailProvider(): string {
    return this.getOptional('EMAIL_PROVIDER') || 'smtp';
  }
  get smtpHost(): string {
    return this.getOptional('SMTP_HOST') || 'localhost';
  }
  get smtpPort(): number {
    return Number(this.getOptional('SMTP_PORT') || 587);
  }
  get smtpSecure(): boolean {
    return this.getOptional('SMTP_SECURE') === 'true';
  }
  get smtpUser(): string {
    return this.getOptional('SMTP_USER') || '';
  }
  get smtpPass(): string {
    return this.getOptional('SMTP_PASS') || '';
  }
  get zeptomailToken(): string {
    return this.getOptional('ZEPTOMAIL_TOKEN') || '';
  }
  get zeptomailSmtpHost(): string {
    return this.getOptional('ZEPTOMAIL_SMTP_HOST') || '';
  }
  get zeptomailDc(): string {
    return this.getOptional('ZEPTOMAIL_DC') || '';
  }
  get fromEmail(): string {
    return this.getOptional('FROM_EMAIL') || 'noreply@nestlancer.com';
  }
  get fromName(): string {
    return this.getOptional('FROM_NAME') || 'Nestlancer';
  }
  get replyToEmail(): string {
    return this.getOptional('REPLY_TO') || '';
  }

  // ── Razorpay ─────────────────────────────────────────────
  get razorpayKeyId(): string {
    return this.getOptional('RAZORPAY_KEY_ID') || '';
  }
  get razorpayKeySecret(): string {
    return this.getOptional('RAZORPAY_KEY_SECRET') || '';
  }
  get razorpayWebhookSecret(): string {
    return this.getOptional('RAZORPAY_WEBHOOK_SECRET') || '';
  }
  get razorpayCurrency(): string {
    return this.getOptional('RAZORPAY_CURRENCY') || 'INR';
  }

  // ── Turnstile ────────────────────────────────────────────
  get turnstileSiteKey(): string {
    return this.getOptional('TURNSTILE_SITE_KEY') || '';
  }
  get turnstileSecretKey(): string {
    return this.getOptional('TURNSTILE_SECRET_KEY') || '';
  }

  // ── Rate Limiting ────────────────────────────────────────
  get rateLimitAnonymous(): number {
    return Number(this.getOptional('RATE_LIMIT_ANONYMOUS') || 100);
  }
  get rateLimitUser(): number {
    return Number(this.getOptional('RATE_LIMIT_USER') || 1000);
  }
  get rateLimitPaid(): number {
    return Number(this.getOptional('RATE_LIMIT_PAID') || 5000);
  }
  get rateLimitAdmin(): number {
    return Number(this.getOptional('RATE_LIMIT_ADMIN') || 10000);
  }

  // ── Observability ────────────────────────────────────────
  get tracingEnabled(): boolean {
    return this.getOptional('TRACING_ENABLED') === 'true';
  }
  /** @deprecated Use jaegerOtlpUrl */
  get jaegerUrl(): string {
    return this.getOptional('JAEGER_URL') || '';
  }
  get jaegerOtlpUrl(): string {
    return (
      this.getOptional('JAEGER_OTLP_URL') ||
      this.getOptional('OTEL_EXPORTER_OTLP_TRACES_ENDPOINT') ||
      this.getOptional('JAEGER_URL') ||
      ''
    );
  }
  get otelServiceName(): string {
    return this.getOptional('OTEL_SERVICE_NAME') || this.appName;
  }
  get metricsEnabled(): boolean {
    return this.getOptional('METRICS_ENABLED') !== 'false';
  }
  get metricsPort(): number {
    return Number(this.getOptional('METRICS_PORT') || 9464);
  }
  get metricsBindHost(): string {
    return this.getOptional('METRICS_BIND_HOST') || '0.0.0.0';
  }
  get lokiPushUrl(): string {
    return this.getOptional('LOKI_PUSH_URL') || '';
  }
  get lokiUsername(): string {
    return this.getOptional('LOKI_USERNAME') || '';
  }
  get lokiPassword(): string {
    return this.getOptional('LOKI_PASSWORD') || '';
  }
  get prometheusUrl(): string {
    return this.getOptional('PROMETHEUS_URL') || '';
  }

  // ── Outbox ───────────────────────────────────────────────
  get outboxPollInterval(): number {
    return Number(this.getOptional('OUTBOX_POLL_INTERVAL') || 5000);
  }
  get outboxBatchSize(): number {
    return Number(this.getOptional('OUTBOX_BATCH_SIZE') || 100);
  }
  get outboxMaxRetries(): number {
    return Number(this.getOptional('OUTBOX_MAX_RETRIES') || 5);
  }
}
