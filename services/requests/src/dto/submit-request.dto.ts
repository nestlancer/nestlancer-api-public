import { IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for formal submission of a drafted request.
 */
export class SubmitRequestDto {
  @ApiProperty({
    description:
      'Explicit confirmation that the user is ready to submit this request for administrative review',
    example: true,
  })
  @IsBoolean()
  confirmComplete: boolean;
}
