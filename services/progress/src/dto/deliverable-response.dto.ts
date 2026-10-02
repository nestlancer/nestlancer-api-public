import { DeliverableStatus } from '@nestlancer/common';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents a project deliverable submission.
 */
export class DeliverableResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174222',
    description: 'Unique identifier for the deliverable',
  })
  id: string;

  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174111',
    description: 'Associated milestone ID',
  })
  milestoneId: string;

  @ApiProperty({
    required: false,
    example: 'Phase 1 Documentation Draft',
    description: 'Optional description of the deliverable',
  })
  description?: string;

  @ApiProperty({ type: [Object], description: 'Metadata for associated media/files' })
  media: any[];

  @ApiProperty({
    enum: DeliverableStatus,
    example: DeliverableStatus.PENDING,
    description: 'Current status of the deliverable',
  })
  status: DeliverableStatus;

  @ApiProperty({ example: 1, description: 'Submission version number' })
  version: number;

  @ApiProperty({ required: false, description: 'Current review status/notes' })
  reviewStatus?: any;

  @ApiProperty({ example: '2024-01-10T15:30:00Z', description: 'Timestamp of creation' })
  createdAt: Date;
}
