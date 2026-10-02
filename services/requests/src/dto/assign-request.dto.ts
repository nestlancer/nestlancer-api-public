import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Trim } from '@nestlancer/common';

/** Assignee must be an active admin. Role is checked in the controller, not only by id shape. */
export class AssignRequestDto {
  @ApiProperty({ description: 'User id of an active admin to assign this request to' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  @Trim()
  assigneeId: string;
}
