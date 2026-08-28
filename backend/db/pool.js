/**
 * TrustGuard — PostgreSQL Database Pool
 * Provides a shared pg.Pool configured from DATABASE_URL env variable.
 */
'use strict';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL environment variable is not set.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Log pool-level errors without exposing credentials
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;
