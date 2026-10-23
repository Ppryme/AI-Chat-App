import pg from 'pg';
import dotenv from 'dotenv';
import type { PoolClient } from 'pg';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('CRITICAL: DATABASE_URL is not defined in the environment variables.');
}

// Enable SSL when connecting to hosted providers like Supabase
const isRemoteDb = connectionString?.includes('supabase.com') || connectionString?.includes('sslmode=require');

export const pool = new Pool({
  connectionString,
  ssl: isRemoteDb ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL client error on idle client:', err.message);
});

export async function testConnection(): Promise<boolean> {
  let client: PoolClient | undefined;
  try {
    client = await pool.connect();
    const res = await client.query('SELECT NOW() AS current_time');

    console.log('PostgreSQL connected successfully. Server time:', res.rows[0].current_time);
    return true;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('PostgreSQL connection failed:', err.message);
    return false;
  } finally {
    client?.release();
  }
}
