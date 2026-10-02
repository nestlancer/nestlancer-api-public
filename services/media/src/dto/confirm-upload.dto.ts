import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

/**
 * Data Transfer Object for confirming a completed upload.
 */
export class ConfirmUploadDto {
  @ApiProperty({ description: 'The unique ID assigned during the upload request' })
  @IsString()
  uploadId: string;
}
