import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from '../shared/schema';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set');
  throw new Error('DATABASE_URL environment variable is not set');
}

console.log('Initializing database connection...');

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

console.log('Database connection initialized successfully');

export type Database = typeof db;