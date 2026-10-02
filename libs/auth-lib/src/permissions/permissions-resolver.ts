import { DEFAULT_ROLE_PERMISSIONS } from './default-permissions.config';

/** Flatten seed shape to permission strings like `users:read:own`. */
export function flattenRolePermissions(
  role: string,
  rolePermissions: Record<string, Record<string, string[]>> = DEFAULT_ROLE_PERMISSIONS,
): Set<string> {
  const map = rolePermissions[role];
  if (!map) return new Set();

  const granted = new Set<string>();
  for (const [resource, actions] of Object.entries(map)) {
    for (const action of actions) {
      granted.add(`${resource}:${action}`);
    }
  }
  return granted;
}

export function hasAllPermissions(
  required: string[],
  role: string,
  rolePermissions: Record<string, Record<string, string[]>> = DEFAULT_ROLE_PERMISSIONS,
): boolean {
  if (required.length === 0) return true;

  const granted = flattenRolePermissions(role, rolePermissions);

  // ADMIN wildcard: *:manage grants everything
  if (granted.has('*:manage')) return true;

  return required.every((perm) => {
    if (granted.has(perm)) return true;
    const [resource] = perm.split(':');
    if (resource && granted.has(`${resource}:manage`)) return true;
    return false;
  });
}
