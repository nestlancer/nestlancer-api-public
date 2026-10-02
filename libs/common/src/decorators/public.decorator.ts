import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marks an endpoint as public (no authentication required) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
