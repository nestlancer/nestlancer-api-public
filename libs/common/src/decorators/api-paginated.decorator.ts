import { applyDecorators } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';

/** Adds standard pagination query params to Swagger docs */
export const ApiPaginated = () =>
  applyDecorators(
    ApiQuery({
      name: 'page',
      required: false,
      type: Number,
      description: 'Page number (default: 1)',
    }),
    ApiQuery({
      name: 'limit',
      required: false,
      type: Number,
      description: 'Items per page (default: 20, max: 100)',
    }),
    ApiQuery({
      name: 'sort',
      required: false,
      type: String,
      description: 'Sort field:order (e.g., createdAt:desc)',
    }),
  );
