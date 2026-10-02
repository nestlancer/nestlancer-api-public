// E2E-only uuid mock to avoid Jest ESM issues and to keep IDs deterministic.
// This matches the minimal surface used by libs/common/src/utils/uuid.util.ts.

export function v7(): string {
  // Simple, deterministic UUID-like value; format is valid but value is not meaningful.
  return '00000000-0000-7000-8000-000000000000';
}
