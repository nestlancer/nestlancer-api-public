import { SetMetadata } from '@nestjs/common';
export const IS_READ_ONLY = 'isReadOnly';
/** Marks a method as read-only (uses read replica per ADR-005) */
export const ReadOnly = () => SetMetadata(IS_READ_ONLY, true);
