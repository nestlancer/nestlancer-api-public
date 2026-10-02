import { SetMetadata } from '@nestjs/common';
export const AUDITABLE_KEY = 'auditable';
export const Auditable = (action: string, resourceType: string) =>
  SetMetadata(AUDITABLE_KEY, { action, resourceType });
