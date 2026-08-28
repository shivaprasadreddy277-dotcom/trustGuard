/**
 * TrustGuard — Authentication Tests
 *
 * Uses node:test (built-in) + pg-mem for in-memory PostgreSQL.
 * No real database connection required.
 *
 * Run: npm test  (inside backend/)
 */
'use strict';

// ── Bootstrap env BEFORE any app module is loaded ────────────────────────────
process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost/trustguard_test'; // satisfies require check; pool is mocked

// ── Set up pg-mem pool BEFORE requiring authController ───────────────────────
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

const memDb = newDb();

// Register uuid_generate_v4() so pg-mem can handle UUID defaults
memDb.public.registerFunction({
  name: 'uuid_generate_v4',
  returns: memDb.public.getType('uuid'),
  implementation: () => {
    // Generate a valid v4 UUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },
});

const pgAdapter = memDb.adapters.createPg();
const { Pool: MemPool } = pgAdapter;
const testPool = new MemPool();

// Apply schema to the in-memory db
const rawSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  .replace(/CREATE EXTENSION.*?;/gi, '')              // pg-mem doesn't need extensions
  .replace(/gen_random_uuid\(\)/g, 'uuid_generate_v4()'); // use pg-mem's built-in

testPool.query(rawSchema).catch((err) => {
  console.error('[Test Setup] Schema load error:', err.message);
  process.exit(1);
});

// Inject the mock pool into the module cache so authController uses it
const poolModulePath = require.resolve('../db/pool');
require.cache[poolModulePath] = {
  id: poolModulePath,
  filename: poolModulePath,
  loaded: true,
  exports: testPool,
};

// ── Now load the app (after pool is mocked) ───────────────────────────────────
const http = require('http');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

// ── Minimal HTTP helper: spins up a temp server per call ─────────────────────
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

// ── Shared token across tests ─────────────────────────────────────────────────
let sharedToken = '';

// ════════════════════════════════════════════════════════════════════════════════
// Test 1 — Successful Registration
// ════════════════════════════════════════════════════════════════════════════════
test('1. Successful registration → 201 + user + token', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'testoperator',
    name: 'Test Operator',
    email: 'operator@trustguard.test',
    password: 'SecurePass123!',
  });

  assert.equal(res.status, 201, `Expected 201 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.user, 'Must have user object');
  assert.ok(res.body.token, 'Must have JWT token');
  assert.match(res.body.user.id, /^usr_/, 'id must use usr_ prefix (user_id_str)');
  assert.equal(res.body.user.username, 'testoperator');
  assert.equal(res.body.user.email, 'operator@trustguard.test');
  assert.ok(res.body.user.createdAt, 'Must include createdAt');
  assert.equal(res.body.user.password_hash, undefined, 'password_hash must NOT be in response');
  assert.equal(res.body.user.password, undefined, 'password must NOT be in response');

  sharedToken = res.body.token;
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 2 — Duplicate Registration
// ════════════════════════════════════════════════════════════════════════════════
test('2. Duplicate email registration → 400 EMAIL_ALREADY_EXISTS', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'operator2',
    name: 'Operator Two',
    email: 'operator@trustguard.test', // same email
    password: 'OtherPass456!',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'EMAIL_ALREADY_EXISTS');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 3 — Successful Login
// ════════════════════════════════════════════════════════════════════════════════
test('3. Successful login → 200 + user + token', async () => {
  const res = await req('POST', '/api/auth/login', {
    email: 'operator@trustguard.test',
    password: 'SecurePass123!',
  });

  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.user);
  assert.ok(res.body.token);
  assert.match(res.body.user.id, /^usr_/);
  assert.equal(res.body.user.password_hash, undefined, 'password_hash must NOT be in login response');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 4 — Incorrect Password
// ════════════════════════════════════════════════════════════════════════════════
test('4. Incorrect password → 401 INVALID_CREDENTIALS (generic message)', async () => {
  const res = await req('POST', '/api/auth/login', {
    email: 'operator@trustguard.test',
    password: 'WrongPassword!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'INVALID_CREDENTIALS');
  assert.match(res.body.error.message, /Invalid email or password/, 'Message must be generic');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 5 — Nonexistent User Login
// ════════════════════════════════════════════════════════════════════════════════
test('5. Nonexistent user login → 401 INVALID_CREDENTIALS (same message as wrong password)', async () => {
  const res = await req('POST', '/api/auth/login', {
    email: 'ghost@trustguard.test',
    password: 'AnyPass123!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'INVALID_CREDENTIALS');
  assert.match(res.body.error.message, /Invalid email or password/, 'Must not reveal user existence');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 6 — Authenticated /me
// ════════════════════════════════════════════════════════════════════════════════
test('6. GET /api/auth/me with valid token → 200 + user with createdAt', async () => {
  const res = await req('GET', '/api/auth/me', null, sharedToken);

  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.user);
  assert.match(res.body.user.id, /^usr_/);
  assert.ok(res.body.user.createdAt, '/me response must include createdAt');
  assert.equal(res.body.user.password_hash, undefined);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 7 — Missing Token
// ════════════════════════════════════════════════════════════════════════════════
test('7. GET /api/auth/me with no token → 401 UNAUTHORIZED', async () => {
  const res = await req('GET', '/api/auth/me', null, null);

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 8 — Invalid Token (bad signature)
// ════════════════════════════════════════════════════════════════════════════════
test('8. GET /api/auth/me with wrong-signature token → 401 UNAUTHORIZED', async () => {
  // Sign with a DIFFERENT secret to create an invalid token
  const jwt = require('jsonwebtoken');
  const badToken = jwt.sign({ userId: 'fake', userIdStr: 'usr_fake' }, 'wrong-secret');

  const res = await req('GET', '/api/auth/me', null, badToken);

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 9 — Malformed Token (not a JWT)
// ════════════════════════════════════════════════════════════════════════════════
test('9. GET /api/auth/me with malformed string → 401 UNAUTHORIZED', async () => {
  const res = await req('GET', '/api/auth/me', null, 'this-is-not-a-jwt');

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 10 — password_hash never returned across all endpoints
// ════════════════════════════════════════════════════════════════════════════════
test('10. password_hash never appears in any auth endpoint response', async () => {
  const regRes = await req('POST', '/api/auth/register', {
    username: 'hashcheck',
    name: 'Hash Check',
    email: 'hashcheck@trustguard.test',
    password: 'CheckHash123!',
  });
  const loginRes = await req('POST', '/api/auth/login', {
    email: 'hashcheck@trustguard.test',
    password: 'CheckHash123!',
  });
  const meRes = await req('GET', '/api/auth/me', null, regRes.body.token);

  for (const [label, r] of [['register', regRes], ['login', loginRes], ['me', meRes]]) {
    const bodyStr = JSON.stringify(r.body);
    assert.ok(!bodyStr.includes('password_hash'), `${label}: password_hash must not appear`);
    assert.ok(!bodyStr.includes('"password"'), `${label}: plaintext password must not appear`);
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 11 — JWT_SECRET never exposed in any response
// ════════════════════════════════════════════════════════════════════════════════
test('11. JWT_SECRET never appears in any response body', async () => {
  const loginRes = await req('POST', '/api/auth/login', {
    email: 'operator@trustguard.test',
    password: 'SecurePass123!',
  });
  const meRes = await req('GET', '/api/auth/me', null, loginRes.body.token);

  for (const [label, r] of [['login', loginRes], ['me', meRes]]) {
    const bodyStr = JSON.stringify(r.body);
    assert.ok(
      !bodyStr.includes(process.env.JWT_SECRET),
      `${label}: JWT_SECRET must never appear in response`
    );
  }
});
