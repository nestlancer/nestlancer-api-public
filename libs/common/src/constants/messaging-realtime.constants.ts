/** Redis channel: messaging service publishes here; ws-gateway subscribes and emits Socket.IO `message:new`.
 * Use the same Redis instance for messaging `REDIS_CACHE_URL` and ws-gateway `REDIS_PUBSUB_URL` (or its cache URL fallback).
 */
export const MESSAGING_CHAT_REDIS_CHANNEL = 'nestlancer:messaging:chat';
