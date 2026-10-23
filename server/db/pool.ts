import pg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';           
import path from 'path';  
import type { PoolClient } from 'pg';

dotenv.config({ path: 'server.env' });

const { Pool } = pg;


const rawConnectionString = process.env.DATABASE_URL;
if (!rawConnectionString) {
  throw new Error('CRITICAL: DATABASE_URL is not defined');
}

const dbUrl = new URL(rawConnectionString);
dbUrl.searchParams.delete('sslmode');

const connectionString = dbUrl.toString();

const isRemoteDb =
  dbUrl.hostname.endsWith('.supabase.com') ||
  dbUrl.hostname.endsWith('.supabase.co');

  

const caCert = process.env.SUPABASE_CA_CERT
  ? process.env.SUPABASE_CA_CERT.replace(/\\n/g, '\n')
  : fs.readFileSync(
      path.join(process.cwd(), 'certs', 'prod-ca-2021.crt'),
      'utf8'
    );

console.log('CA loaded:', caCert.includes('-----BEGIN CERTIFICATE-----'));
console.log('CA length:', caCert.length);




export const pool = new Pool({
  connectionString: connectionString,
  ssl: isRemoteDb ? {
    rejectUnauthorized: true,
    ca: caCert,
  } : undefined,
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

    console.log('PostgreSQL connected:', res.rows[0].current_time);
    return true;
  } catch (error) {
    console.error('PostgreSQL connection failed:', error);
    return false;
  } finally {
    client?.release();
  }
}
