/** Date utility functions – all dates in ISO 8601 UTC */
export function toISO(date: Date): string {
  return date.toISOString();
}

export function now(): Date {
  return new Date();
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export function addHours(date: Date, hours: number): Date {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function isExpired(date: Date): boolean {
  return date.getTime() < Date.now();
}

export function diffInSeconds(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 1000);
}
