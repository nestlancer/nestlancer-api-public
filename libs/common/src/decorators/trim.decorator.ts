import { Transform } from 'class-transformer';

/** Trims whitespace from string DTO fields */
export const Trim = () =>
  Transform(({ value }) => (typeof value === 'string' ? value.trim() : value));
