import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { API_PREFIX, API_VERSION } from '@nestlancer/common';

import { AdminModule } from '../modules/admin/admin.module';
import { AuthModule } from '../modules/auth/auth.module';
import { BlogModule } from '../modules/blog/blog.module';
import { ContactModule } from '../modules/contact/contact.module';
import { HealthModule } from '../modules/health/health.module';
import { MediaModule } from '../modules/media/media.module';
import { MessagesModule } from '../modules/messages/messages.module';
import { NotificationsModule } from '../modules/notifications/notifications.module';
import { PaymentsModule } from '../modules/payments/payments.module';
import { PortfolioModule } from '../modules/portfolio/portfolio.module';
import { ProgressModule } from '../modules/progress/progress.module';
import { ProjectsModule } from '../modules/projects/projects.module';
import { QuotesModule } from '../modules/quotes/quotes.module';
import { RequestsModule } from '../modules/requests/requests.module';
import { UsersModule } from '../modules/users/users.module';
import { WebhooksModule } from '../modules/webhooks/webhooks.module';
import { DocumentsModule } from '../modules/documents/documents.module';
import { InvoicesModule } from '../modules/invoices/invoices.module';

import type { OpenApiDocument } from './merge-openapi';

/** Gateway proxy modules whose routes are the canonical public API surface. */
export const GATEWAY_PROXY_SWAGGER_MODULES = [
  AuthModule,
  UsersModule,
  RequestsModule,
  QuotesModule,
  ProjectsModule,
  ProgressModule,
  PaymentsModule,
  MessagesModule,
  NotificationsModule,
  MediaModule,
  PortfolioModule,
  BlogModule,
  ContactModule,
  AdminModule,
  HealthModule,
  WebhooksModule,
  DocumentsModule,
  InvoicesModule,
] as const;

let registeredGatewayProxyDocument: OpenApiDocument | null = null;

export function registerGatewayProxyOpenApiDocument(document: OpenApiDocument): void {
  registeredGatewayProxyDocument = document;
}

export function getRegisteredGatewayProxyOpenApiDocument(): OpenApiDocument | null {
  return registeredGatewayProxyDocument;
}

/**
 * OpenAPI for gateway-facing URLs (e.g. `/api/v1/blog/posts`, `/api/v1/admin/dashboard/overview`).
 * Merged into `/docs-all-json` before microservice specs so clients see the same paths the gateway serves.
 */
export function createGatewayProxyOpenApiDocument(app: INestApplication): OpenApiDocument {
  const config = new DocumentBuilder()
    .setTitle('Nestlancer Gateway (Public API)')
    .setDescription(
      'Canonical gateway routes. Microservice specs in `/docs-all-json` may use internal paths; prefer these URLs.',
    )
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addServer(`/${API_PREFIX}/${API_VERSION}`, 'Nestlancer API v1')
    .build();

  return SwaggerModule.createDocument(
    app as Parameters<typeof SwaggerModule.createDocument>[0],
    config,
    { include: [...GATEWAY_PROXY_SWAGGER_MODULES] },
  ) as unknown as OpenApiDocument;
}
