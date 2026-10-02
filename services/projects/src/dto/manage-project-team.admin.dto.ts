import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ManageProjectTeamAdminDto {
  @ApiProperty({
    description: 'Identifier of the team member to associate with the project',
    example: 'admin-or-contractor-user-id',
  })
  @IsString()
  memberId: string;
}
