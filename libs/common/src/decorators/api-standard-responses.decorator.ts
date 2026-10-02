import { PATH_METADATA, METHOD_METADATA } from '@nestjs/common/constants';
import { DECORATORS } from '@nestjs/swagger/dist/constants';
import { ApiStandardResponse } from './api-standard-response.decorator';

/** Only auto-fill the primary success status; 202 Accepted is often a different payload shape. */
const SUCCESS_STATUSES = new Set(['200', '201']);

function hasJsonResponseSchema(methodRef: object): boolean {
  const responses: Record<
    string,
    { content?: Record<string, { schema?: unknown }>; schema?: unknown }
  > = Reflect.getMetadata(DECORATORS.API_RESPONSE, methodRef) ?? {};

  for (const [status, meta] of Object.entries(responses)) {
    if (!SUCCESS_STATUSES.has(status)) continue;
    if (meta?.content?.['application/json']?.schema) return true;
    // `@ApiOkResponse({ schema })` from {@link ApiStandardResponse} uses top-level `schema`.
    if (meta?.schema) return true;
  }
  return false;
}

/**
 * Documents the standard success envelope on every route handler that lacks a JSON response schema.
 * Apply at controller class level to avoid repeating {@link ApiStandardResponse} on each method.
 */
export function ApiStandardResponses(): ClassDecorator {
  return (target: Function) => {
    const prototype = target.prototype;

    for (const propertyName of Object.getOwnPropertyNames(prototype)) {
      if (propertyName === 'constructor') continue;

      const descriptor = Object.getOwnPropertyDescriptor(prototype, propertyName);
      if (!descriptor || typeof descriptor.value !== 'function') continue;

      const handler = descriptor.value;
      const routePath = Reflect.getMetadata(PATH_METADATA, handler);
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);
      if (routePath === undefined || requestMethod === undefined) continue;
      if (hasJsonResponseSchema(handler)) continue;

      ApiStandardResponse()(prototype, propertyName, descriptor);
    }
  };
}
