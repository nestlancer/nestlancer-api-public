import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Restricts endpoint to specified roles */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
