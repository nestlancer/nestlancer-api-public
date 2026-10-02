import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Valid execution states for background system jobs.
 */
export enum JobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

/**
 * Filter criteria for monitoring asynchronous background tasks.
 */
export class QueryJobsDto {
  @ApiPropertyOptional({
    description: 'Filter jobs by their current execution status',
    enum: JobStatus,
    example: JobStatus.RUNNING,
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    description: 'Filter jobs by the specific processing queue name',
    example: 'email-notifications',
  })
  @IsOptional()
  @IsString()
  queue?: string;
}
