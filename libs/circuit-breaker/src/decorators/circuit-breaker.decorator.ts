import { SetMetadata } from '@nestjs/common';
export const CIRCUIT_BREAKER_KEY = 'circuitBreaker';
export const WithCircuitBreaker = (name: string) => SetMetadata(CIRCUIT_BREAKER_KEY, name);
