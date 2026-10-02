import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdminMilestoneDto {
  @ApiProperty({ description: 'Milestone name', example: 'Design phase' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({
    description: 'Milestone description',
    example: 'All design mockups approved',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({
    description:
      'Milestone amount in smallest currency unit. Ignored (forced to 0) when the project already has a payment schedule — delivery milestones are non-billable.',
    example: 0,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  amount?: number;

  @ApiProperty({
    description: 'Optional due date for this milestone (ISO 8601)',
    required: false,
    example: '2025-06-01',
  })
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiProperty({
    description: 'Display order for this milestone (0-based)',
    required: false,
    example: 1,
  })
  @IsOptional()
  @IsInt()
  order?: number;
}

export class CreateMilestonesAdminDto {
  @ApiProperty({ type: [AdminMilestoneDto], description: 'List of milestones to create' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => AdminMilestoneDto)
  milestones: AdminMilestoneDto[];
}
