import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubmitFeedbackDto {
  @ApiProperty({
    description: 'Short title for the feedback entry',
    example: 'Feedback from client about overall experience',
    maxLength: 200,
  })
  @IsString()
  @MaxLength(200)
  title: string;

  @ApiProperty({
    description: 'Detailed feedback text from the client',
    example: 'Overall experience was positive.',
    maxLength: 2000,
  })
  @IsString()
  @MaxLength(2000)
  feedback: string;
}
