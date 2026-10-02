import { Controller, Get, Head, HttpCode, HttpStatus, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiStandardResponses, Public, UserRole } from '@nestlancer/common';
import { Cacheable } from '@nestlancer/cache';
import { JwtAuthGuard, Roles, RolesGuard } from '@nestlancer/auth-lib';
import { HealthService } from '../../services/health.service';
import { DatabaseHealthService } from '../../services/database-health.service';
import { CacheHealthService } from '../../services/cache-health.service';
import { QueueHealthService } from '../../services/queue-health.service';
import { StorageHealthService } from '../../services/storage-health.service';
import { ExternalServicesHealthService } from '../../services/external-services-health.service';
import { WorkersHealthService } from '../../services/workers-health.service';
import { WebsocketHealthService } from '../../services/websocket-health.service';
import { SystemMetricsService } from '../../services/system-metrics.service';
import { FeatureFlagsHealthService } from '../../services/feature-flags-health.service';
import { ServiceRegistryHealthService } from '../../services/service-registry-health.service';

import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

/**
 * Public controller for the Health service.
 * Provides multiple endpoints for monitoring the overall status, readiness, liveness,
 * and specific infrastructure components of the microservice architecture.
 *
 * @category Monitoring
 */
@ApiTags('Health - Monitoring')
@Controller()
@ApiStandardResponses()
export class HealthPublicController {
  constructor(
    private readonly healthService: HealthService,
    private readonly dbHealth: DatabaseHealthService,
    private readonly cacheHealth: CacheHealthService,
    private readonly queueHealth: QueueHealthService,
    private readonly storageHealth: StorageHealthService,
    private readonly externalHealth: ExternalServicesHealthService,
    private readonly workersHealth: WorkersHealthService,
    private readonly wsHealth: WebsocketHealthService,
    private readonly metricsService: SystemMetricsService,
    private readonly featureFlags: FeatureFlagsHealthService,
    private readonly registryHealth: ServiceRegistryHealthService,
  ) {}

  /**
   * Retrieves the high-level operational status of the entire ecosystem.
   * Aggregates availability data from all critical dependency layers.
   *
   * @param res Express response object for dynamic status code determination
   * @returns A promise resolving to the global system health status
   */
  @Get()
  @Public()
  @Cacheable({ ttl: 15000 })
  @ApiOperation({
    summary: 'Get aggregated system health',
    description:
      'Monitor the holistic health of the application, including all integrated micro-components.',
  })
  @ApiResponse({ status: 200, description: 'System is operational' })
  @ApiResponse({ status: 503, description: 'One or more critical components are failed' })
  async getAggregatedHealth(@Res() res: Response): Promise<any> {
    const health = await this.healthService.getAggregatedHealth();

    let status = HttpStatus.OK;
    if (health.status === 'unhealthy') status = HttpStatus.SERVICE_UNAVAILABLE;
    else if (health.status === 'degraded') status = HttpStatus.PARTIAL_CONTENT;

    return res.status(status).json(health);
  }

  /**
   * Accesses granular diagnostic metrics for every infrastructure component.
   *
   * @param res Express response object for dynamic status code determination
   * @returns A promise resolving to detailed system health diagnostics
   */
  @Get('detailed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Cacheable({ ttl: 15000 })
  @ApiOperation({
    summary: 'Get detailed health diagnostics',
    description: 'Access in-depth availability and performance data for all individual subsystems.',
  })
  async getDetailedHealth(@Res() res: Response): Promise<any> {
    const health = await this.healthService.getAggregatedHealth();

    let status = HttpStatus.OK;
    if (health.status === 'unhealthy') status = HttpStatus.SERVICE_UNAVAILABLE;
    else if (health.status === 'degraded') status = HttpStatus.PARTIAL_CONTENT;

    return res.status(status).json({ ...health, detailed: true });
  }

  /**
   * Kubernetes readiness probe endpoint.
   * Checks if the application is fully initialized and ready to accept traffic.
   *
   * @param res Express response object
   * @returns Readiness status
   */
  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Checks if the service is ready to serve requests.',
  })
  async getReadiness(@Res() res: Response): Promise<any> {
    const readiness = await this.healthService.getReadiness();
    const status = readiness.status === 'ready' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(readiness);
  }

  /**
   * Kubernetes liveness probe endpoint.
   * Simple check to see if the process is alive.
   *
   * @returns Basic liveness confirmation
   */
  @Get('live')
  @Public()
  @ApiOperation({
    summary: 'Liveness probe',
    description: 'Simple ping to verify the process is running.',
  })
  async getLiveness(): Promise<any> {
    return this.healthService.getLiveness();
  }

  /**
   * Minimal connectivity check (HEAD).
   */
  @Head('ping')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ping (HEAD)', description: 'Minimal connectivity check returns 200 OK.' })
  async pingHead(): Promise<void> {
    return;
  }

  /**
   * Minimal connectivity check (GET).
   */
  @Get('ping')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ping (GET)', description: 'Minimal connectivity check returns 200 OK.' })
  async pingGet(): Promise<{ status: string }> {
    return { status: 'ok' };
  }

  /**
   * Checks the health of the primary database connections.
   *
   * @param res Express response object
   * @returns Database connection status
   */
  @Get('database')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Database health',
    description: 'Verify connection to the primary database (e.g., PostgreSQL).',
  })
  async getDatabaseHealth(@Res() res: Response): Promise<any> {
    const result = await this.dbHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  /**
   * Checks the health of the distributed cache system.
   *
   * @param res Express response object
   * @returns Cache system status
   */
  @Get('cache')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cache health',
    description: 'Verify connectivity to the Redis cache cluster.',
  })
  async getCacheHealth(@Res() res: Response): Promise<any> {
    const result = await this.cacheHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  /**
   * Checks the health of the message queue and background job processors.
   *
   * @param res Express response object
   * @returns Queue system status
   */
  @Get('queue')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Queue health',
    description: 'Check status of background job queues and brokers.',
  })
  async getQueueHealth(@Res() res: Response): Promise<any> {
    const result = await this.queueHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  /**
   * Checks the health of the blob storage or object storage service.
   *
   * @param res Express response object
   * @returns Storage system status
   */
  @Get('storage')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Storage health',
    description: 'Verify accessibility of the file storage/S3 bucket.',
  })
  async getStorageHealth(@Res() res: Response): Promise<any> {
    const result = await this.storageHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  /**
   * Retrieves health status for all internal microservices.
   *
   * @returns Aggregated microservices status
   */
  @Get('microservices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Inter-service health',
    description: 'Monitor communication health between internal microservices.',
  })
  async getMicroservicesHealth(): Promise<any> {
    // Abstracted to aggregated response for now, typically hits registry or sidecar
    return { status: 'healthy', ...this.healthService.getAggregatedHealth() };
  }

  /**
   * Checks connectivity to external 3rd-party APIs and services.
   *
   * @param res Express response object
   * @returns External services status
   */
  @Get('external')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'External services health',
    description: 'Check status of 3rd-party integrations (e.g., Payment Gateways, Email).',
  })
  async getExternalHealth(@Res() res: Response): Promise<any> {
    const result = await this.externalHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  /**
   * Checks the health of active worker processes.
   *
   * @param res Express response object
   * @returns Workers status
   */
  @Get('workers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Workers health',
    description: 'Verify that background worker nodes are active.',
  })
  async getWorkersHealth(@Res() res: Response): Promise<any> {
    const result = await this.workersHealth.check();
    // Always return 200 with status in body so probes/monitoring can read details.
    // Use /health/ready for hard fail-closed readiness.
    return res.status(HttpStatus.OK).json(result);
  }

  /**
   * Checks the status of the WebSocket gateway.
   *
   * @param res Express response object
   * @returns WebSocket status
   */
  @Get('websocket')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'WebSocket health',
    description: 'Monitor the availability of the real-time communications layer.',
  })
  async getWebsocketHealth(@Res() res: Response): Promise<any> {
    const result = await this.wsHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }

  /**
   * Retrieves underlying system resource metrics (CPU, Memory).
   *
   * @returns System metrics data
   */
  @Get('system')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'System metrics',
    description: 'Fetch basic host system metrics like memory and CPU utilization.',
  })
  async getSystemMetrics(): Promise<any> {
    return { status: 'healthy', ...this.metricsService.getMetrics() };
  }

  /**
   * Checks availability of the feature flag service.
   *
   * @returns Feature flag system status
   */
  @Get('features')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Feature flag health',
    description: 'Check status of the dynamic feature toggle service.',
  })
  async getFeatureFlags(): Promise<any> {
    return this.featureFlags.check();
  }

  /**
   * Checks the health of the Service Registry (Consul/Eureka).
   *
   * @param res Express response object
   * @returns Registry status
   */
  @Get('registry')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Registry health',
    description: 'Verify connection to the service discovery and registry node.',
  })
  async getRegistryHealth(@Res() res: Response): Promise<any> {
    const result = await this.registryHealth.check();
    const status = result.status === 'healthy' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE;
    return res.status(status).json(result);
  }
}
