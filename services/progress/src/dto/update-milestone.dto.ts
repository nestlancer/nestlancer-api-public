import { PartialType } from '@nestjs/swagger';
import { CreateMilestoneDto } from './create-milestone.dto';

/**
 * Data Transfer Object for updating an existing project milestone.
 */
export class UpdateMilestoneDto extends PartialType(CreateMilestoneDto) {}
