import { applyDecorators, SetMetadata, Type } from '@nestjs/common';
import { ApiCreatedResponse, ApiExtraModels, ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiSuccessEnvelopeDto } from '../dto/api-success-envelope.dto';
import { ResponseMetadataDto } from '../dto/response-metadata.dto';

export interface ApiStandardResponseOptions {
  /** Response DTO class for `data` (alternative to first positional argument) */
  type?: Type<unknown>;
  /** Human-readable description for the documented response */
  message?: string;
  /** Alias for `message` (NestJS Swagger style) */
  description?: string;
  /** HTTP status code (default 200; use 201 for creates) */
  status?: number;
  /** When true, documents `data` as an array of `model` */
  isArray?: boolean;
}

function isResponseOptions(value: unknown): value is ApiStandardResponseOptions {
  return typeof value === 'object' && value !== null && !(value instanceof Function);
}

function resolveModel(
  modelOrOptions?: Type<unknown> | ApiStandardResponseOptions,
  maybeOptions?: ApiStandardResponseOptions,
): { model?: Type<unknown>; options: ApiStandardResponseOptions } {
  if (modelOrOptions === undefined) {
    return { model: maybeOptions?.type, options: maybeOptions ?? {} };
  }
  if (isResponseOptions(modelOrOptions)) {
    const merged = { ...modelOrOptions, ...maybeOptions };
    return { model: merged.type, options: merged };
  }
  return { model: modelOrOptions, options: maybeOptions ?? {} };
}

function envelopeSchema(model?: Type<unknown>, isArray = false) {
  const dataSchema =
    model && model !== Object
      ? isArray
        ? { type: 'array' as const, items: { $ref: getSchemaPath(model) } }
        : { $ref: getSchemaPath(model) }
      : { type: 'object' as const, additionalProperties: true };

  return {
    allOf: [
      { $ref: getSchemaPath(ApiSuccessEnvelopeDto) },
      {
        type: 'object' as const,
        required: ['status', 'data', 'metadata'],
        properties: {
          status: { type: 'string' as const, enum: ['success'] },
          data: dataSchema,
          metadata: { $ref: getSchemaPath(ResponseMetadataDto) },
        },
      },
    ],
  };
}

/**
 * Documents the gateway success envelope `{ status, data, metadata }` for OpenAPI.
 * Use on handlers wrapped by {@link TransformResponseInterceptor}.
 */
export function ApiStandardResponse(
  modelOrOptions?: Type<unknown> | ApiStandardResponseOptions,
  maybeOptions?: ApiStandardResponseOptions,
): MethodDecorator & ClassDecorator {
  const { model, options } = resolveModel(modelOrOptions, maybeOptions);
  const status = options.status ?? 200;
  const description =
    options.message ??
    options.description ??
    (model && model !== Object
      ? `${model.name} wrapped in the standard success envelope`
      : 'Standard success envelope');

  const extraModels: Type<unknown>[] = [ApiSuccessEnvelopeDto, ResponseMetadataDto];
  if (model && model !== Object) {
    extraModels.push(model);
  }

  const responseDecorator =
    status === 201
      ? ApiCreatedResponse({ description, schema: envelopeSchema(model, options.isArray) })
      : ApiOkResponse({ description, schema: envelopeSchema(model, options.isArray) });

  return applyDecorators(ApiExtraModels(...extraModels), responseDecorator);
}

/**
 * @deprecated Use {@link ApiStandardResponse} — kept for backward compatibility.
 */
export function SuccessResponse(
  modelOrOptions?: Type<unknown> | ApiStandardResponseOptions,
  maybeOptions?: ApiStandardResponseOptions,
): MethodDecorator & ClassDecorator {
  return ApiStandardResponse(modelOrOptions, maybeOptions);
}

/** Metadata key for idempotent endpoints (see `@nestlancer/idempotency`). */
export const IDEMPOTENT_KEY = 'idempotent';

/** Marks a handler as idempotent; pair with `IdempotencyModule` where enforced. */
export function Idempotent(): MethodDecorator {
  return SetMetadata(IDEMPOTENT_KEY, true);
}
