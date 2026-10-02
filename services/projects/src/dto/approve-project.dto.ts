import {
  IsString,
  IsOptional,
  MaxLength,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Data for detailed feedback on project aspects.
 */
class FeedbackDto {
  @ApiProperty({ description: 'Rating for work quality (1-5)', example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  quality: number;

  @ApiProperty({
    description: 'Rating for communication level (1-5)',
    example: 4,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  communication: number;

  @ApiProperty({
    description: 'Rating for meeting deadlines (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  timeliness: number;

  @ApiProperty({
    description: 'Rating for professional conduct (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  professionalism: number;

  @ApiProperty({
    description: 'Overall satisfaction rating (1-5)',
    example: 5,
    minimum: 1,
    maximum: 5,
  })
  @IsNumber()
  @Min(1)
  @Max(5)
  overallSatisfaction: number;
}

/**
 * Data for a public testimonial.
 */
class TestimonialDto {
  @ApiProperty({
    description: 'The text of the testimonial',
    example: 'Great work! Highly recommended.',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  text: string;

  @ApiPropertyOptional({
    description: 'Whether this testimonial can be displayed publicly',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowPublicUse?: boolean;
}

/**
 * DTO for approving a project and providing feedback/testimonials.
 */
export class ApproveProjectDto {
  @ApiProperty({ description: 'Overall project star rating', example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Breakdown of feedback for various categories', type: FeedbackDto })
  @ValidateNested()
  @Type(() => FeedbackDto)
  feedback: FeedbackDto;

  @ApiPropertyOptional({ description: 'Optional testimonial for public use', type: TestimonialDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TestimonialDto)
  testimonial?: TestimonialDto;

  @ApiPropertyOptional({
    description: 'Internal or additional qualitative comments',
    example: 'Everything was smooth.',
    maxLength: 2000,
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  comments?: string;
}
