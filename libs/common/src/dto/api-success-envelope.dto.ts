import { ApiProperty } from '@nestjs/swagger';
import { ResponseMetadataDto } from './response-metadata.dto';

/**
 * Standard success envelope applied by {@link TransformResponseInterceptor}.
 * Document this (via {@link ApiStandardResponse}) so OpenAPI clients model runtime JSON.
 */
export class ApiSuccessEnvelopeDto {
  @ApiProperty({ enum: ['success'], example: 'success' })
  status!: 'success';

  @ApiProperty({
    description: 'Business payload returned by the controller handler',
    type: 'object',
    additionalProperties: true,
  })
  data!: unknown;

  @ApiProperty({ type: () => ResponseMetadataDto })
  metadata!: ResponseMetadataDto;
}
