import {
  IsString,
  MaxLength,
  IsOptional,
  IsDateString,
  IsArray,
  IsInt,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data Transfer Object for creating a project milestone.
 */
export class CreateMilestoneDto {
  @ApiProperty({
    example: 'Frontend MVP Development',
    maxLength: 200,
    description: 'The name of the milestone',
  })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiPropertyOptional({
    example: 'Implementation of the core frontend features...',
    description: 'Detailed description of milestone objectives',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '2024-02-01', description: 'Expected start date (ISO string)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2024-02-15', description: 'Expected completion date (ISO string)' })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    example: '2024-02-15',
    description: 'Due date alias (ISO string). Falls back to endDate if omitted.',
  })
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional({
    example: 5000,
    description:
      'Payment amount for this milestone (in smallest currency unit, e.g. paise for INR)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @ApiPropertyOptional({
    example: 'INR',
    description: 'Currency code for the milestone payment amount',
  })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Homepage UI', 'Auth Flow'],
    description: 'Initial list of deliverable titles',
  })
  @IsOptional()
  @IsArray()
  deliverables?: string[];

  @ApiPropertyOptional({ example: 2, description: 'The sequential order of this milestone' })
  @IsOptional()
  @IsInt()
  order?: number;
}
