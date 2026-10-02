import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, MaxLength, IsOptional, IsEnum } from 'class-validator';
import { CommentStatus } from '@nestlancer/common';

/**
 * Data Transfer Object for updating or moderating a blog comment.
 */
export class UpdateCommentDto {
  @ApiPropertyOptional({
    example: 'Revised comment content...',
    description: 'The updated body of the comment',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ApiPropertyOptional({
    enum: CommentStatus,
    description: 'The updated moderation status of the comment',
  })
  @IsOptional()
  @IsEnum(CommentStatus)
  status?: CommentStatus;

  @ApiPropertyOptional({
    example: 'Violates community guidelines.',
    description: 'Internal reason for a moderation action',
  })
  @IsOptional()
  @IsString()
  moderationMessage?: string;
}
