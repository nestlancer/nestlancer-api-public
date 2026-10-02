import { ParseUuidPipe } from '../../../src/pipes/parse-uuid.pipe';
import { BadRequestException } from '@nestjs/common';
import { generateUuid } from '../../../src/utils/uuid.util';

describe('ParseUuidPipe', () => {
  let pipe: ParseUuidPipe;

  beforeEach(() => {
    pipe = new ParseUuidPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should return valid UUID v4 as is', () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000';
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('should return valid UUID v7 as is', () => {
    const uuid = generateUuid();
    expect(pipe.transform(uuid)).toBe(uuid);
  });

  it('should return valid CUID as is', () => {
    const cuid = 'cjld2cyuq0000t3rmniod1foy';
    expect(pipe.transform(cuid)).toBe(cuid);
  });

  it('should throw BadRequestException for invalid UUID', () => {
    expect(() => pipe.transform('invalid-uuid')).toThrow(BadRequestException);
  });
});
