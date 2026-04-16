const { Pool } = require('pg');

// Use SSL for remote databases (Render, Railway, Neon, etc.)
// Skip SSL for local development (localhost / 127.0.0.1)
const isLocal =
  !process.env.DATABASE_URL ||
  process.env.DATABASE_URL.includes('localhost') ||
  process.env.DATABASE_URL.includes('127.0.0.1');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

module.exports = pool;
