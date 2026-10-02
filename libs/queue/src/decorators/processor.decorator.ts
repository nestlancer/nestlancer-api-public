import { SetMetadata } from '@nestjs/common';

export const PROCESSOR_KEY = 'QUEUE_PROCESSOR';

export const Processor = (queueName: string): ClassDecorator => {
  return SetMetadata(PROCESSOR_KEY, queueName);
};
