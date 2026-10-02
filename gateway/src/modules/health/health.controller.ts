import { Controller, Get, Head, HttpCode, HttpStatus, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';

import { Request } from 'express';

import { Roles } from '@nestlancer/auth-lib';
import { ApiStandardResponses, Public, UserRole } from '@nestlancer/common';

import { HealthService } from './health.service';
import { HttpProxyService } from '../../proxy';

/**
 * Health Controller
 * Provides health check endpoints for the gateway and aggregated service health.
 * Sub-routes (ping, database, cache, etc.) proxy to the health microservice.
 */
@Controller('health')
@ApiTags('health')
@ApiStandardResponses()
export class HealthController {
  constructor(
    private readonly healthService: HealthService,
    private readonly proxy: HttpProxyService,
  ) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Gateway health check', description: 'Returns gateway health status' })
  check() {
    return this.healthService.getGatewayHealth();
  }

  @Get('detailed')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Detailed health check',
    description: 'Returns detailed health status for all infrastructure',
  })
  async detailed() {
    return this.healthService.checkAllServices();
  }

  @Get('ready')
  @Public()
  @ApiOperation({
    summary: 'Readiness probe',
    description: 'Checks if critical services are ready',
  })
  async ready() {
    const { ready, criticalServices } = await this.healthService.isReady();

    return {
      status: ready ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      ...(criticalServices.length > 0 && { unavailableServices: criticalServices }),
    };
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe', description: 'Checks if gateway is alive' })
  live() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('dependencies')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Dependency health',
    description: 'Aggregated health check of all services',
  })
  async checkDependencies() {
    return this.healthService.checkAllServices();
  }

  @Get('services/:name')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Check specific service health' })
  @ApiParam({ name: 'name', description: 'Service name' })
  async checkService(@Param('name') name: string) {
    const isHealthy = await this.healthService.isServiceHealthy(name);
    return {
      service: name,
      status: isHealthy ? 'up' : 'down',
      timestamp: new Date().toISOString(),
    };
  }

  @Head('ping')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'HEAD /health/ping' })
  async pingHead(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/ping');
  }

  @Get('ping')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'GET /health/ping' })
  async pingGet(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/ping');
  }

  @Get('database')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Database health' })
  async database(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/database');
  }

  @Get('cache')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Cache health' })
  async cache(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/cache');
  }

  @Get('queue')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Queue health' })
  async queue(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/queue');
  }

  @Get('storage')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Storage health' })
  async storage(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/storage');
  }

  @Get('microservices')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Microservices health' })
  async microservices(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/microservices');
  }

  @Get('external')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'External services health' })
  async external(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/external');
  }

  @Get('workers')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Workers health' })
  async workers(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/workers');
  }

  @Get('websocket')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'WebSocket health' })
  async websocket(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/websocket');
  }

  @Get('system')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'System metrics' })
  async system(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/system');
  }

  @Get('features')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Feature flags health' })
  async features(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/features');
  }

  @Get('registry')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Registry health' })
  async registry(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/registry');
  }

  @Get('debug')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Admin debug diagnostics (delegate to health service)' })
  async debug(@Req() req: Request) {
    return this.proxy.forward('health', req, undefined, '/api/v1/health/debug');
  }
}
