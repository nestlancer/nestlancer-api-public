import { Injectable, OnModuleInit } from '@nestjs/common';
import { MetricsService } from '../metrics.service';

/**
 * Custom metrics collector for registering application-specific business metrics.
 * Provides factory methods to create metrics on demand.
 */
@Injectable()
export class CustomMetricsCollector implements OnModuleInit {
  constructor(private readonly metrics: MetricsService) {}

  onModuleInit(): void {
    // Register common business metrics
    this.metrics.createCounter(
      'business_events_total',
      'Total number of business events processed',
      ['event_type', 'service'],
    );

    this.metrics.createCounter('payments_processed_total', 'Total number of payments processed', [
      'status',
      'currency',
    ]);

    this.metrics.createHistogram(
      'payment_amount_paise',
      'Payment amounts in paise',
      ['currency'],
      [100, 500, 1000, 5000, 10000, 50000, 100000, 500000, 1000000],
    );

    this.metrics.createGauge('active_projects_total', 'Total number of currently active projects');

    this.metrics.createGauge('registered_users_total', 'Total number of registered users', [
      'role',
    ]);
  }

  recordBusinessEvent(eventType: string, service: string): void {
    this.metrics.incrementCounter('business_events_total', { event_type: eventType, service });
  }

  recordPayment(status: string, currency: string, amountPaise: number): void {
    this.metrics.incrementCounter('payments_processed_total', { status, currency });
    this.metrics.observeHistogram('payment_amount_paise', amountPaise, { currency });
  }

  setActiveProjects(count: number): void {
    this.metrics.setGauge('active_projects_total', count);
  }

  setRegisteredUsers(count: number, role: string): void {
    this.metrics.setGauge('registered_users_total', count, { role });
  }
}
