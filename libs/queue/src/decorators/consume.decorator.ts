import { SetMetadata } from '@nestjs/common';
export const CONSUME_KEY = 'consume';
export const Consume = (queue: string) => SetMetadata(CONSUME_KEY, queue);
