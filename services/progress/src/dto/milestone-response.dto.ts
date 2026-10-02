import { MilestoneStatus } from '@nestlancer/common';
import { DeliverableResponseDto } from './deliverable-response.dto';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Represents the detailed state of a project milestone.
 */
export class MilestoneResponseDto {
  @ApiProperty({
    example: '123e4567-e89b-12d3-a456-426614174111',
    description: 'Unique identifier for the milestone',
  })
  id: string;

  @ApiProperty({ example: 'Initial Research Phase', description: 'The name of the milestone' })
  name: string;

  @ApiProperty({
    required: false,
    example: 'Deep dive into user requirements and market analysis',
    description: 'Optional detailed description',
  })
  description?: string;

  @ApiProperty({
    enum: MilestoneStatus,
    example: MilestoneStatus.IN_PROGRESS,
    description: 'Current status of the milestone',
  })
  status: MilestoneStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00Z', description: 'Scheduled start date' })
  startDate: Date;

  @ApiProperty({ example: '2024-01-15T00:00:00Z', description: 'Scheduled end date' })
  endDate: Date;

  @ApiProperty({ example: 45, description: 'Completion percentage (0-100)' })
  completionPercentage: number;

  @ApiProperty({
    type: [DeliverableResponseDto],
    description: 'List of deliverables associated with this milestone',
  })
  deliverables: DeliverableResponseDto[];

  @ApiProperty({
    required: false,
    example: '2024-01-16T10:00:00Z',
    description: 'Timestamp of client approval',
  })
  approvedAt?: Date;

  @ApiProperty({
    example: 1,
    description: 'Display order of the milestone in the project sequence',
  })
  order: number;
}
