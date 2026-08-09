import Redis from 'ioredis';
import * as dotenv from 'dotenv';

dotenv.config();

const valkeyUrl = process.env.VALKEY_URL || process.env.valkey_connectionString || 'redis://localhost:6379';

export const valkey = new Redis(valkeyUrl, {
  retryStrategy(times) {
    return Math.min(times * 500, 2000);
  },
  enableOfflineQueue: false,
});

valkey.on('error', (err) => {
  console.error('[valkey] connection error:', err.message);
});
