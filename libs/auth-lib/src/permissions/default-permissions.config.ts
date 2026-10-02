/** Default permission map used by the auth permissions resolver. */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, Record<string, string[]>> = {
  USER: {
    users: ['read:own', 'update:own'],
    requests: ['create', 'read:own', 'update:own'],
    projects: ['read:own'],
    messages: ['create', 'read:own'],
    notifications: ['read:own', 'update:own'],
    media: ['create', 'read:own'],
    portfolio: ['read'],
    blog: ['read'],
    contact: ['create'],
  },
  ADMIN: {
    '*': ['manage'],
  },
};
