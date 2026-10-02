import { PartialType } from '@nestjs/swagger';
import { CreateNotificationTemplateDto } from './create-notification-template.dto';

/**
 * Data Transfer Object for updating an existing notification template.
 * All fields are optional.
 */
export class UpdateNotificationTemplateDto extends PartialType(CreateNotificationTemplateDto) {}
