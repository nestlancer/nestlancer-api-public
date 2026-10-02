import { IsString, IsEnum, IsNotEmpty } from 'class-validator';

import { MediaContext, MediaJobType } from '../interfaces/media-job.interface';

export class ProcessMediaDto {
  @IsEnum(MediaJobType)
  @IsNotEmpty()
  type: MediaJobType;

  @IsString()
  @IsNotEmpty()
  mediaId: string;

  @IsString()
  @IsNotEmpty()
  s3Key: string;

  @IsString()
  @IsNotEmpty()
  contentType: string;

  @IsEnum(MediaContext)
  @IsNotEmpty()
  context: MediaContext;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
