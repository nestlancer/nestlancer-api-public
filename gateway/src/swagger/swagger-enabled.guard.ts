import { CanActivate, Injectable, NotFoundException } from '@nestjs/common';

import { isSwaggerEnabled } from '@nestlancer/common';

/** Blocks OpenAPI proxy routes when Swagger is disabled (production default). */
@Injectable()
export class SwaggerEnabledGuard implements CanActivate {
  canActivate(): boolean {
    if (!isSwaggerEnabled()) {
      throw new NotFoundException();
    }
    return true;
  }
}
