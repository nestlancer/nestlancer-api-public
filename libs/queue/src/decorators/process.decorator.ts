import { SetMetadata } from '@nestjs/common';

export const PROCESS_KEY = 'QUEUE_PROCESS';

export const Process = (name?: string): MethodDecorator => {
  return SetMetadata(PROCESS_KEY, name);
};
