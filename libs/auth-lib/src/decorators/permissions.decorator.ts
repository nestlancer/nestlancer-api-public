import { SetMetadata } from '@nestjs/common';
import { PERMISSIONS_KEY } from '../constants';

/** Decorator to require specific permissions for an endpoint */
export const Permissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
