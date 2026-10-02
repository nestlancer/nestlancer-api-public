import { SetMetadata } from '@nestjs/common';
export const REQUIRE_TURNSTILE_KEY = 'requireTurnstile';
export const RequireTurnstile = () => SetMetadata(REQUIRE_TURNSTILE_KEY, true);
