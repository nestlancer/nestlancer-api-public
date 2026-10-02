import { v7 as uuidv7 } from 'uuid';

/** Generates a UUID v7 (time-ordered, RFC 9562) */
export function generateUuid(): string {
  return uuidv7();
}

/** Validates a string is a valid UUID (any version) */
export function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
