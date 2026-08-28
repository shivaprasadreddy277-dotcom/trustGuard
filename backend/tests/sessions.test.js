/**
 * TrustGuard — Sessions Tests (Cycle 2.3)
 *
 * Uses node:test (built-in) + pg-mem for in-memory PostgreSQL.
 * No real database or server required.
 *
 * Run: npm run test:sessions
 */
'use strict';

// ── Bootstrap env BEFORE any app module is loaded ────────────────────────────
process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost/trustguard_test';

// ── Set up pg-mem ─────────────────────────────────────────────────────────────
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

const memDb = newDb();

const crypto = require('crypto');

memDb.public.registerFunction({
  name: 'uuid_generate_v4',
  returns: memDb.public.getType('uuid'),
  implementation: () => crypto.randomUUID(),
});

const pgAdapter = memDb.adapters.createPg();
const { Pool: MemPool } = pgAdapter;
const testPool = new MemPool();

const rawSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  .replace(/CREATE EXTENSION.*?;/gi, '')
  .replace(/gen_random_uuid\(\)/g, 'uuid_generate_v4()');

// ── Seed: two users + one default agent (agent_001) ──────────────────────────
const USER_A_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const USER_B_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const AGENT_001_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc';

const SEED_SQL = `
  INSERT INTO users (id, user_id_str, username, name, email, password_hash) VALUES
  ('${USER_A_ID}', 'usr_test_a', 'user_a', 'User Alpha', 'usera@trustguard.test', 'hash'),
  ('${USER_B_ID}', 'usr_test_b', 'user_b', 'User Beta',  'userb@trustguard.test', 'hash');

  INSERT INTO agents (id, agent_id_str, name, description, declared_objective,
                      permissions, status, current_trust_score)
  VALUES (
    '${AGENT_001_ID}',
    'agent_001',
    'NovaCorp Customer Support Agent',
    'Assists customer queries.',
    'Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.',
    ARRAY['file.read','db.read'],
    'ACTIVE',
    95
  );
`;

testPool.query(rawSchema)
  .then(() => testPool.query(SEED_SQL))
  .catch((err) => { console.error('[Test Setup]', err.message); process.exit(1); });

// ── Inject mock pool ──────────────────────────────────────────────────────────
const poolPath = require.resolve('../db/pool');
require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: testPool };

// ── Load app ──────────────────────────────────────────────────────────────────
const http = require('http');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

// ── JWT tokens for two distinct users ────────────────────────────────────────
const tokenA = jwt.sign(
  { userId: USER_A_ID, userIdStr: 'usr_test_a', username: 'user_a', email: 'usera@trustguard.test' },
  process.env.JWT_SECRET, { expiresIn: '1h' }
);
const tokenB = jwt.sign(
  { userId: USER_B_ID, userIdStr: 'usr_test_b', username: 'user_b', email: 'userb@trustguard.test' },
  process.env.JWT_SECRET, { expiresIn: '1h' }
);

// ── HTTP helper ───────────────────────────────────────────────────────────────
function req(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) };
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const opts = { hostname: '127.0.0.1', port, path: urlPath, method, headers };
      const r = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          server.close();
          try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
          catch { resolve({ status: res.statusCode, body: data }); }
        });
      });
      r.on('error', (e) => { server.close(); reject(e); });
      if (payload) r.write(payload);
      r.end();
    });
  });
}

// ── Shared state ──────────────────────────────────────────────────────────────
let createdSessionId = '';

// ════════════════════════════════════════════════════════════════════════════════
// Test 1 — Unauthenticated session creation rejected
// ════════════════════════════════════════════════════════════════════════════════
test('1. POST /api/sessions without token → 401 UNAUTHORIZED', async () => {
  const res = await req('POST', '/api/sessions',
    { originalIntent: 'Test intent.' }, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 2 — Authenticated session creation succeeds
// ════════════════════════════════════════════════════════════════════════════════
test('2. POST /api/sessions with valid token → 201 with sessionId + originalIntent', async () => {
  const INTENT = 'Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.';
  const res = await req('POST', '/api/sessions', { originalIntent: INTENT }, tokenA);

  assert.equal(res.status, 201, `Expected 201 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.sessionId, 'sessionId must be present');
  assert.equal(res.body.originalIntent, INTENT, 'originalIntent must be returned exactly');

  createdSessionId = res.body.sessionId;
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 3 — session_id_str format is correct (sess_ prefix)
// ════════════════════════════════════════════════════════════════════════════════
test('3. sessionId uses sess_ prefix (session_id_str format)', async () => {
  assert.ok(createdSessionId, 'createdSessionId must have been set by Test 2');
  assert.match(createdSessionId, /^sess_/, 'sessionId must start with sess_');
  // Must not be a raw UUID
  assert.ok(!/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(createdSessionId),
    'sessionId must not be a raw UUID');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 4 — Session persisted in database with correct user ownership
// ════════════════════════════════════════════════════════════════════════════════
test('4. Session is persisted; user_id matches authenticated user (JWT ownership)', async () => {
  const dbRes = await testPool.query(
    `SELECT session_id_str, user_id, agent_id, original_intent, status, current_trust_score
     FROM sessions WHERE session_id_str = $1`,
    [createdSessionId]
  );
  assert.equal(dbRes.rows.length, 1, 'Session must exist in DB');
  const row = dbRes.rows[0];

  // Ownership: user_id must match the authenticated user from JWT (User A)
  assert.equal(row.user_id, USER_A_ID,
    'session.user_id must match the JWT-authenticated user, not any client-provided ID');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 5 — Correct agent relationship (defaults to agent_001)
// ════════════════════════════════════════════════════════════════════════════════
test('5. Session agent_id resolves to the default demo agent (agent_001)', async () => {
  const dbRes = await testPool.query(
    `SELECT agent_id FROM sessions WHERE session_id_str = $1`,
    [createdSessionId]
  );
  assert.equal(dbRes.rows[0].agent_id, AGENT_001_ID,
    'session.agent_id must resolve to the agent_001 internal UUID');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 6 — original_intent is stored EXACTLY as provided
// ════════════════════════════════════════════════════════════════════════════════
test('6. original_intent is stored exactly as provided (not rewritten)', async () => {
  const EXACT_INTENT = 'Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.';
  const dbRes = await testPool.query(
    `SELECT original_intent FROM sessions WHERE session_id_str = $1`,
    [createdSessionId]
  );
  assert.equal(dbRes.rows[0].original_intent, EXACT_INTENT,
    'original_intent must be stored verbatim — never rewritten or summarized');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 7 — Initial session status is ACTIVE
// ════════════════════════════════════════════════════════════════════════════════
test('7. Session initial status is ACTIVE', async () => {
  const dbRes = await testPool.query(
    `SELECT status FROM sessions WHERE session_id_str = $1`, [createdSessionId]
  );
  assert.equal(dbRes.rows[0].status, 'ACTIVE');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 8 — Trust score initialized within 0–100
// ════════════════════════════════════════════════════════════════════════════════
test('8. Initial current_trust_score is within 0–100', async () => {
  const dbRes = await testPool.query(
    `SELECT current_trust_score FROM sessions WHERE session_id_str = $1`, [createdSessionId]
  );
  const score = dbRes.rows[0].current_trust_score;
  assert.ok(
    Number.isInteger(score) && score >= 0 && score <= 100,
    `Trust score ${score} must be 0–100`
  );
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 9 — Session retrieval by ID
// ════════════════════════════════════════════════════════════════════════════════
test('9. GET /api/sessions/:sessionId → 200 with correct fields', async () => {
  const res = await req('GET', `/api/sessions/${createdSessionId}`, null, tokenA);
  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.sessionId, createdSessionId, 'sessionId must match');
  assert.ok(res.body.originalIntent, 'originalIntent must be present');
  // Internal UUID must never be returned
  assert.equal(res.body.id, undefined, 'Internal UUID must not be returned');
  assert.equal(res.body.userId, undefined, 'userId must not be returned');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 10 — Missing originalIntent rejected
// ════════════════════════════════════════════════════════════════════════════════
test('10. POST /api/sessions with missing originalIntent → 400 MISSING_INTENT', async () => {
  const res = await req('POST', '/api/sessions', {}, tokenA);
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'MISSING_INTENT');
  assert.match(res.body.error.message, /originalIntent/);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 11 — Empty originalIntent rejected
// ════════════════════════════════════════════════════════════════════════════════
test('11. POST /api/sessions with empty originalIntent → 400 MISSING_INTENT', async () => {
  const res = await req('POST', '/api/sessions', { originalIntent: '   ' }, tokenA);
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'MISSING_INTENT');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 12 — GET with unknown sessionId → 404 SESSION_NOT_FOUND
// ════════════════════════════════════════════════════════════════════════════════
test('12. GET /api/sessions/sess_unknown → 404 SESSION_NOT_FOUND', async () => {
  const res = await req('GET', '/api/sessions/sess_doesnotexist', null, tokenA);
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, 'SESSION_NOT_FOUND');
  assert.match(res.body.error.message, /sess_doesnotexist/);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 13 — Unauthenticated GET rejected
// ════════════════════════════════════════════════════════════════════════════════
test('13. GET /api/sessions/:sessionId without token → 401 UNAUTHORIZED', async () => {
  const res = await req('GET', `/api/sessions/${createdSessionId}`, null, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 14 — User B can create their own independent session
// ════════════════════════════════════════════════════════════════════════════════
test('14. User B creates a session → JWT user_id is User B, not User A', async () => {
  const res = await req('POST', '/api/sessions',
    { originalIntent: 'User B independent task.' }, tokenB);
  assert.equal(res.status, 201, `Expected 201 got ${res.status}: ${JSON.stringify(res.body)}`);

  const sessionIdB = res.body.sessionId;

  // Verify DB: user_id must be User B's UUID — NOT User A's
  const dbRes = await testPool.query(
    `SELECT user_id FROM sessions WHERE session_id_str = $1`, [sessionIdB]
  );
  assert.equal(dbRes.rows[0].user_id, USER_B_ID,
    'User B session must be owned by User B from JWT — not from any client-provided ID');
  assert.notEqual(dbRes.rows[0].user_id, USER_A_ID,
    'User B session must NOT be owned by User A');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 15 — Internal UUID never exposed in any session response
// ════════════════════════════════════════════════════════════════════════════════
test('15. Internal UUID never appears in POST or GET session responses', async () => {
  const createRes = await req('POST', '/api/sessions',
    { originalIntent: 'UUID leak check.' }, tokenA);
  assert.equal(createRes.status, 201);

  const getRes = await req('GET', `/api/sessions/${createRes.body.sessionId}`, null, tokenA);
  assert.equal(getRes.status, 200);

  const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const createBody = JSON.stringify(createRes.body);
  const getBody = JSON.stringify(getRes.body);

  assert.ok(!UUID_PATTERN.test(createBody),
    `POST response must not contain raw UUIDs: ${createBody}`);
  assert.ok(!UUID_PATTERN.test(getBody),
    `GET response must not contain raw UUIDs: ${getBody}`);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 16 — Response shape matches API_CONTRACT.md exactly
// ════════════════════════════════════════════════════════════════════════════════
test('16. POST and GET response shapes match API_CONTRACT.md', async () => {
  const INTENT = 'Contract compliance check intent.';
  const createRes = await req('POST', '/api/sessions', { originalIntent: INTENT }, tokenA);
  assert.equal(createRes.status, 201);

  // POST response must have EXACTLY: sessionId, originalIntent (no extra keys)
  const createKeys = Object.keys(createRes.body);
  assert.ok(createKeys.includes('sessionId'), 'POST response must have sessionId');
  assert.ok(createKeys.includes('originalIntent'), 'POST response must have originalIntent');
  assert.equal(createRes.body.originalIntent, INTENT);

  const getRes = await req('GET', `/api/sessions/${createRes.body.sessionId}`, null, tokenA);
  assert.equal(getRes.status, 200);

  // GET response must have EXACTLY: sessionId, originalIntent
  const getKeys = Object.keys(getRes.body);
  assert.ok(getKeys.includes('sessionId'), 'GET response must have sessionId');
  assert.ok(getKeys.includes('originalIntent'), 'GET response must have originalIntent');
  assert.equal(getRes.body.sessionId, createRes.body.sessionId);
  assert.equal(getRes.body.originalIntent, INTENT);
});
