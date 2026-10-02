import { PartialType } from '@nestjs/swagger';
import { CreateRequestDto } from './create-request.dto';

/**
 * DTO for updating an existing project request (Draft or Active).
 */
export class UpdateRequestDto extends PartialType(CreateRequestDto) {}
