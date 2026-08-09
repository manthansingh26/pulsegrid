import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const valkeyUrl = process.env.VALKEY_URL || 'redis://localhost:6379';

export const valkey = new Redis(valkeyUrl, {
  retryStrategy(times) {
    return Math.min(times * 500, 2000);
  },
  // We want to fail fast if it's down, not queue commands forever if disconnected,
  // to avoid memory leaks or hanging the worker/API.
  enableOfflineQueue: false,
});

valkey.on('error', (err) => {
  console.error('[valkey] connection error:', err.message);
});
