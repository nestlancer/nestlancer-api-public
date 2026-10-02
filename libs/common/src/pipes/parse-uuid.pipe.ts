import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { REGEX } from '../constants/regex.constants';

/**
 * Validates that a parameter is a valid UUID (any version) or CUID.
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (REGEX.UUID.test(value) || REGEX.CUID.test(value)) {
      return value;
    }
    throw new BadRequestException(`Invalid ID format: ${value}`);
  }
}
