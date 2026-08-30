/**
 * TrustGuard — Authentication Tests
 *
 * Uses node:test (built-in) + pg-mem for in-memory PostgreSQL.
 * No real database connection required.
 *
 * Run: npm test (inside backend/)
 */
'use strict';

// ── Bootstrap env BEFORE any app module is loaded ────────────────────────────
process.env.JWT_SECRET = 'test-only-secret-do-not-use-in-production';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgres://test:test@localhost/trustguard_test';
process.env.GOOGLE_CLIENT_ID = 'test-google-client-id.apps.googleusercontent.com';
process.env.GOOGLE_CLIENT_SECRET = 'test-google-client-secret-xyz';

// ── Set up pg-mem pool BEFORE requiring authController ───────────────────────
const { newDb } = require('pg-mem');
const fs = require('fs');
const path = require('path');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

const memDb = newDb();

const crypto = require('crypto');

// Register uuid_generate_v4() with impure: true so each call returns a unique UUID
memDb.public.registerFunction({
  name: 'uuid_generate_v4',
  impure: true,
  returns: memDb.public.getType('uuid'),
  implementation: () => crypto.randomUUID(),
});

const pgAdapter = memDb.adapters.createPg();
const { Pool: MemPool } = pgAdapter;
const testPool = new MemPool();

// Apply schema to the in-memory db
const rawSchema = fs
  .readFileSync(SCHEMA_PATH, 'utf8')
  .replace(/CREATE EXTENSION.*?;/gi, '')
  .replace(/gen_random_uuid\(\)/g, 'uuid_generate_v4()');

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
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };
    if (token) headers['Authorization'] = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const opts = { hostname: '127.0.0.1', port, path: urlPath, method, headers };
      const r = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => {
          data += c;
        });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      r.on('error', (e) => {
        server.close();
        reject(e);
      });
      if (payload) r.write(payload);
      r.end();
    });
  });
}

// ── Shared token across tests ─────────────────────────────────────────────────
let sharedToken = '';

// ════════════════════════════════════════════════════════════════════════════════
// 1. Registration Success
// ════════════════════════════════════════════════════════════════════════════════
test('1. Successful registration → 201 + user + token', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'testoperator',
    name: 'Test Operator',
    email: 'operator@trustguard.test',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
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
// 2. Duplicate Registration Checks
// ════════════════════════════════════════════════════════════════════════════════
test('2. Duplicate email registration → 400 EMAIL_ALREADY_EXISTS', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'unique_user_2',
    name: 'Operator Two',
    email: 'operator@trustguard.test', // same email
    password: 'OtherPass456!',
    confirmPassword: 'OtherPass456!',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'EMAIL_ALREADY_EXISTS');
  assert.equal(res.body.error?.message, 'Email already registered.');
});

test('3. Duplicate username registration → 400 USERNAME_ALREADY_EXISTS', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'testoperator', // same username
    name: 'Different Operator',
    email: 'different@trustguard.test',
    password: 'OtherPass456!',
    confirmPassword: 'OtherPass456!',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'USERNAME_ALREADY_EXISTS');
  assert.equal(res.body.error?.message, 'Username already registered.');
});

// ════════════════════════════════════════════════════════════════════════════════
// 4. Validation Errors: Password Mismatch, Invalid Email, Short Password
// ════════════════════════════════════════════════════════════════════════════════
test('4. Registration with password mismatch → 400 PASSWORD_MISMATCH', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'mismatch_user',
    name: 'Mismatch User',
    email: 'mismatch@trustguard.test',
    password: 'SecurePass123!',
    confirmPassword: 'DifferentPassword456!',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'PASSWORD_MISMATCH');
  assert.equal(res.body.error?.message, 'Passwords do not match.');
});

test('5. Registration with invalid email → 400 VALIDATION_ERROR', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'bademail_user',
    name: 'Bad Email',
    email: 'not-an-email',
    password: 'SecurePass123!',
    confirmPassword: 'SecurePass123!',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'VALIDATION_ERROR');
});

test('6. Registration with short password (< 8 chars) → 400 VALIDATION_ERROR', async () => {
  const res = await req('POST', '/api/auth/register', {
    username: 'shortpass_user',
    name: 'Short Pass',
    email: 'shortpass@trustguard.test',
    password: 'short',
    confirmPassword: 'short',
  });

  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'VALIDATION_ERROR');
});

// ════════════════════════════════════════════════════════════════════════════════
// 7. Login: Success & Generic Failures
// ════════════════════════════════════════════════════════════════════════════════
test('7. Successful login via email → 200 + user + token', async () => {
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

test('8. Successful login via username → 200 + user + token', async () => {
  const res = await req('POST', '/api/auth/login', {
    email: 'testoperator', // username passed in email field
    password: 'SecurePass123!',
  });

  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.user.username, 'testoperator');
});

test('9. Incorrect password → 401 INVALID_CREDENTIALS (generic message)', async () => {
  const res = await req('POST', '/api/auth/login', {
    email: 'operator@trustguard.test',
    password: 'WrongPassword!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'INVALID_CREDENTIALS');
  assert.match(res.body.error.message, /Invalid email or password/, 'Message must be generic');
});

test('10. Nonexistent user login → 401 INVALID_CREDENTIALS', async () => {
  const res = await req('POST', '/api/auth/login', {
    email: 'ghost@trustguard.test',
    password: 'AnyPass123!',
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'INVALID_CREDENTIALS');
  assert.match(res.body.error.message, /Invalid email or password/, 'Must not reveal user existence');
});

// ════════════════════════════════════════════════════════════════════════════════
// 11. Google Sign-In Flow
// ════════════════════════════════════════════════════════════════════════════════
test('11. Google authentication for new user → 201 + created user + token', async () => {
  const res = await req('POST', '/api/auth/google', {
    mockPayload: {
      email: 'newgoogleuser@novacorp.com',
      name: 'Google New User',
      sub: 'google_oauth_sub_12345',
    },
  });

  assert.equal(res.status, 201, `Expected 201 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.user);
  assert.ok(res.body.token);
  assert.equal(res.body.user.email, 'newgoogleuser@novacorp.com');
  assert.match(res.body.user.id, /^usr_/);
});

test('12. Google authentication for existing user → 200 + linked account + token', async () => {
  const res = await req('POST', '/api/auth/google', {
    mockPayload: {
      email: 'operator@trustguard.test', // existing registered email
      name: 'Test Operator',
      sub: 'google_oauth_sub_99999',
    },
  });

  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.user.email, 'operator@trustguard.test');
  assert.equal(res.body.user.username, 'testoperator');
});

// ════════════════════════════════════════════════════════════════════════════════
// 13. Authenticated /me & Token Security
// ════════════════════════════════════════════════════════════════════════════════
test('13. GET /api/auth/me with valid token → 200 + user with createdAt', async () => {
  const res = await req('GET', '/api/auth/me', null, sharedToken);

  assert.equal(res.status, 200, `Expected 200 got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.ok(res.body.user);
  assert.match(res.body.user.id, /^usr_/);
  assert.ok(res.body.user.createdAt, '/me response must include createdAt');
  assert.equal(res.body.user.password_hash, undefined);
});

test('14. GET /api/auth/me with missing token → 401 UNAUTHORIZED', async () => {
  const res = await req('GET', '/api/auth/me', null, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

test('15. GET /api/auth/me with invalid token → 401 UNAUTHORIZED', async () => {
  const jwt = require('jsonwebtoken');
  const badToken = jwt.sign({ userId: 'fake', userIdStr: 'usr_fake' }, 'wrong-secret');
  const res = await req('GET', '/api/auth/me', null, badToken);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// 16. Secrets Isolation: password_hash, JWT_SECRET, GOOGLE_CLIENT_SECRET
// ════════════════════════════════════════════════════════════════════════════════
test('16. Secrets never appear in any response body across endpoints', async () => {
  const regRes = await req('POST', '/api/auth/register', {
    username: 'hashcheck2',
    name: 'Hash Check 2',
    email: 'hashcheck2@trustguard.test',
    password: 'CheckHash123!',
    confirmPassword: 'CheckHash123!',
  });
  const loginRes = await req('POST', '/api/auth/login', {
    email: 'hashcheck2@trustguard.test',
    password: 'CheckHash123!',
  });
  const meRes = await req('GET', '/api/auth/me', null, regRes.body.token);
  const googleRes = await req('POST', '/api/auth/google', {
    mockPayload: {
      email: 'sec_check@novacorp.com',
      name: 'Security Check',
      sub: 'google_oauth_sub_555',
    },
  });

  const responses = [
    ['register', regRes],
    ['login', loginRes],
    ['me', meRes],
    ['google', googleRes],
  ];

  for (const [label, r] of responses) {
    const bodyStr = JSON.stringify(r.body);
    assert.ok(!bodyStr.includes('password_hash'), `${label}: password_hash must not appear`);
    assert.ok(!bodyStr.includes('"password"'), `${label}: plaintext password must not appear`);
    assert.ok(!bodyStr.includes(process.env.JWT_SECRET), `${label}: JWT_SECRET must not appear`);
    assert.ok(!bodyStr.includes(process.env.GOOGLE_CLIENT_SECRET), `${label}: GOOGLE_CLIENT_SECRET must not appear`);
  }
});
