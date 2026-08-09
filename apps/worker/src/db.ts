import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

let connectionString = process.env.DATABASE_URL || process.env.postgresql_connectionString;
if (connectionString && !connectionString.endsWith('/db') && !connectionString.endsWith('/pulsegrid')) {
  connectionString = connectionString.replace(/\/$/, '') + '/db';
}

export const pool = new Pool({
  connectionString,
});

pool.on('error', (err, client) => {
  console.error('[worker-db] Unexpected error on idle client', err);
});
