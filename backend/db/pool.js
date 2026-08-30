/**
 * TrustGuard — PostgreSQL Database Pool
 * Provides a shared pg.Pool configured from DATABASE_URL env variable.
 */
'use strict';

const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('[DB] DATABASE_URL environment variable is not set.');
}

const isLocal = !process.env.DATABASE_URL || 
  process.env.DATABASE_URL.includes('localhost') || 
  process.env.DATABASE_URL.includes('127.0.0.1');

const enableSsl = process.env.DATABASE_SSL === 'true' || 
  process.env.NODE_ENV === 'production' || 
  !isLocal || 
  process.env.DATABASE_URL.includes('supabase.co') ||
  process.env.DATABASE_URL.includes('pooler.supabase.com');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: enableSsl ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  // Log pool-level errors without exposing credentials
  console.error('[DB] Unexpected pool error:', err.message);
});

module.exports = pool;

