import dotenv from 'dotenv';
dotenv.config();

import pkg from 'pg';
const { Client } = pkg;

console.log('Testing PostgreSQL connection with native driver...');
console.log('DATABASE_URL:', process.env.DATABASE_URL);

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

try {
  await client.connect();
  console.log('Connected successfully with native PostgreSQL driver');
  
  const result = await client.query('SELECT 1 as test');
  console.log('Query result:', result.rows);
  
  await client.end();
  console.log('Connection closed');
} catch (error) {
  console.error('PostgreSQL connection failed:', error);
  await client.end();
}
