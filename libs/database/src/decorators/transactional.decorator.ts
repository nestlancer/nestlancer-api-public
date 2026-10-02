import { SetMetadata } from '@nestjs/common';
export const IS_TRANSACTIONAL = 'isTransactional';
/** Marks a method to run within a database transaction */
export const Transactional = () => SetMetadata(IS_TRANSACTIONAL, true);
