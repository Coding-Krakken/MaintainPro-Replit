import dotenv from 'dotenv';
dotenv.config();

const url = process.env.DATABASE_URL;
console.log('Full DATABASE_URL:', url);

// Parse the URL to see individual components
const parsedUrl = new URL(url);
console.log('Parsed URL components:');
console.log('Protocol:', parsedUrl.protocol);
console.log('Host:', parsedUrl.host);
console.log('Hostname:', parsedUrl.hostname);
console.log('Port:', parsedUrl.port);
console.log('Username:', parsedUrl.username);
console.log('Password:', '[REDACTED]');
console.log('Pathname:', parsedUrl.pathname);
console.log('Search:', parsedUrl.search);
