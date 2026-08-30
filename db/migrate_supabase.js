/**
 * TrustGuard — Supabase / PostgreSQL Migration & Verification Script
 * Applies db/schema.sql and db/seed.sql to the configured PostgreSQL database
 * and verifies that all tables and seed records exist.
 *
 * Usage:
 *   node db/migrate_supabase.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

// Ensure packages installed in backend/node_modules are resolved correctly
const backendModules = path.join(__dirname, '../backend/node_modules');
if (!module.paths.includes(backendModules)) {
  module.paths.push(backendModules);
}

const { Pool } = require('pg');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL || DATABASE_URL.includes('[YOUR-PASSWORD]')) {
  console.error('[Migration Error] DATABASE_URL is not configured with real credentials.');
  console.error('Please configure your real Supabase connection string in backend/.env:');
  console.error('DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres');
  process.exit(1);
}

const isLocal = DATABASE_URL.includes('localhost') || DATABASE_URL.includes('127.0.0.1');
const enableSsl = process.env.DATABASE_SSL === 'true' || 
  process.env.NODE_ENV === 'production' || 
  !isLocal || 
  DATABASE_URL.includes('supabase.co') ||
  DATABASE_URL.includes('pooler.supabase.com');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: enableSsl ? { rejectUnauthorized: false } : false,
});

async function runMigration() {
  console.log('----------------------------------------------------');
  console.log('TrustGuard Supabase PostgreSQL Migration');
  console.log('----------------------------------------------------');
  console.log(`Target: ${isLocal ? 'Local PostgreSQL' : 'Remote / Supabase PostgreSQL'}`);
  console.log(`SSL Enabled: ${enableSsl}`);

  const client = await pool.connect();
  try {
    console.log('\n[1/4] Applying Schema (db/schema.sql)...');
    const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schemaSql);
    console.log('✓ Schema applied successfully.');

    console.log('\n[2/4] Applying Seed Data (db/seed.sql)...');
    const seedSql = fs.readFileSync(path.join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seedSql);
    console.log('✓ Seed data inserted successfully.');

    console.log('\n[3/4] Verifying Table Structures...');
    const tables = [
      'users',
      'agents',
      'sessions',
      'attack_chains',
      'agent_events',
      'security_decisions',
      'alerts',
      'simulation_runs'
    ];

    const stats = {};
    for (const table of tables) {
      const res = await client.query(`SELECT count(*)::int as count FROM ${table}`);
      stats[table] = res.rows[0].count;
      console.log(`  - ${table}: ${stats[table]} records`);
    }

    console.log('\n[4/4] Verifying Relational Integrity...');
    const chainCheck = await client.query(`
      SELECT 
        ae.event_id_str, 
        ae.action, 
        ae.tool, 
        sd.decision,
        sd.trust_score,
        ac.chain_id_str
      FROM agent_events ae
      JOIN security_decisions sd ON ae.id = sd.event_id
      JOIN attack_chains ac ON ae.attack_chain_id = ac.id
      WHERE ac.chain_id_str = 'chain_abc_sim_01'
      ORDER BY ae.timestamp ASC
    `);

    console.log(`✓ Verified ${chainCheck.rows.length} correlated events in attack chain 'chain_abc_sim_01'.`);

    console.log('\n====================================================');
    console.log('DATABASE CONNECTION : PASS');
    console.log('SCHEMA              : PASS');
    console.log('SEED DATA           : PASS');
    console.log('====================================================');
  } catch (err) {
    console.error('\n✗ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
