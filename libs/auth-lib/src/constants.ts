/**
 * Metadata key for permissions guard
 */
export const PERMISSIONS_KEY = 'permissions';

/**
 * Metadata key for roles guard (can be used to override or supplement common roles key)
 */
export const ROLES_KEY = 'roles';

/**
 * Metadata key for public routes
 */
export const IS_PUBLIC_KEY = 'isPublic';

/** Re-exported from @nestlancer/common — keep auth-lib consumers stable. */
export { PUBLIC_DOCUMENTATION_PATH_SEGMENTS, isPublicDocumentationPath } from '@nestlancer/common';
