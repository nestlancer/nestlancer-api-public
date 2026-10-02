import { ApiProperty } from '@nestjs/swagger';

import { IsEnum } from 'class-validator';

import { ContactStatus } from '@nestlancer/common';

/**
 * Data Transfer Object for updating the status of a contact inquiry.
 */
export class UpdateContactStatusDto {
  @ApiProperty({ enum: ContactStatus, description: 'The new status to assign to the inquiry' })
  @IsEnum(ContactStatus)
  status: ContactStatus;
}
