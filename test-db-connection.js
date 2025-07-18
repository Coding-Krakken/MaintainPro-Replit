import dotenv from 'dotenv';
dotenv.config();

import { neon } from '@neondatabase/serverless';

console.log('Testing database connection...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const sql = neon(process.env.DATABASE_URL);

try {
  const result = await sql`SELECT 1 as test`;
  console.log('Database connection successful:', result);
} catch (error) {
  console.error('Database connection failed:', error);
}
