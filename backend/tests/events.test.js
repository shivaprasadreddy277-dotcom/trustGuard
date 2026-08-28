/**
 * TrustGuard — Agent Events & Telemetry Tests (Cycle 2.4)
 *
 * Uses node:test (built-in) + pg-mem for in-memory PostgreSQL.
 * Tests event ingestion, validation, ownership enforcement, evidence persistence,
 * and security boundaries.
 *
 * Run: npm run test:events
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
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');

const memDb = newDb();

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

// ── Seed users, agents, and sessions ──────────────────────────────────────────
const USER_A_ID = '11111111-1111-1111-1111-111111111111';
const USER_B_ID = '22222222-2222-2222-2222-222222222222';
const AGENT_001_ID = '33333333-3333-3333-3333-333333333333';
const AGENT_002_ID = '44444444-4444-4444-4444-444444444444';
const SESS_A_ID = '55555555-5555-5555-5555-555555555555';
const SESS_B_ID = '66666666-6666-6666-6666-666666666666';

const SEED_SQL = `
  INSERT INTO users (id, user_id_str, username, name, email, password_hash) VALUES
  ('${USER_A_ID}', 'usr_test_a', 'user_a', 'User Alpha', 'usera@trustguard.test', 'hash'),
  ('${USER_B_ID}', 'usr_test_b', 'user_b', 'User Beta',  'userb@trustguard.test', 'hash');

  INSERT INTO agents (id, agent_id_str, name, description, declared_objective, permissions, status, current_trust_score) VALUES
  (
    '${AGENT_001_ID}',
    'agent_001',
    'NovaCorp Customer Support Agent',
    'Assists customer queries and order searches.',
    'Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.',
    ARRAY['file.read', 'db.read', 'llm.evaluate', 'agent.delegate'],
    'ACTIVE',
    95
  ),
  (
    '${AGENT_002_ID}',
    'agent_002',
    'NovaCorp Sub Agent',
    'Sub-agent execution worker.',
    'Execute assigned tasks from supervisor.',
    ARRAY['file.read'],
    'ACTIVE',
    90
  );

  INSERT INTO sessions (id, session_id_str, user_id, agent_id, original_intent, current_trust_score, status) VALUES
  ('${SESS_A_ID}', 'sess_user_a', '${USER_A_ID}', '${AGENT_001_ID}', 'Original intent for User A session.', 95, 'ACTIVE'),
  ('${SESS_B_ID}', 'sess_user_b', '${USER_B_ID}', '${AGENT_001_ID}', 'Original intent for User B session.', 90, 'ACTIVE');
`;

testPool.query(rawSchema)
  .then(() => testPool.query(SEED_SQL))
  .catch((err) => {
    console.error('[Test Setup Error]', err.message);
    process.exit(1);
  });

// ── Inject mock pool ──────────────────────────────────────────────────────────
const poolPath = require.resolve('../db/pool');
require.cache[poolPath] = { id: poolPath, filename: poolPath, loaded: true, exports: testPool };

// ── Load app ──────────────────────────────────────────────────────────────────
const http = require('http');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const app = require('../app');

// ── JWT tokens ────────────────────────────────────────────────────────────────
const tokenA = jwt.sign(
  { userId: USER_A_ID, userIdStr: 'usr_test_a', username: 'user_a', email: 'usera@trustguard.test' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const tokenB = jwt.sign(
  { userId: USER_B_ID, userIdStr: 'usr_test_b', username: 'user_b', email: 'userb@trustguard.test' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

// ── HTTP Helper ───────────────────────────────────────────────────────────────
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

// ── Valid Base Event Payload ──────────────────────────────────────────────────
const makeValidEventPayload = (overrides = {}) => ({
  eventId: 'evt_test_001',
  sessionId: 'sess_user_a',
  agentId: 'agent_001',
  parentAgentId: null,
  timestamp: '2026-08-27T21:10:00Z',
  action: 'database_connector.query',
  tool: 'database_connector',
  resource: 'NovaCorp_DB',
  dataSensitivity: 'HIGH',
  authorization: {
    status: 'ALLOWED',
    requiredPermission: 'reports.read',
    grantedPermissions: ['reports.read', 'network.send'],
  },
  provenance: {
    sourceType: 'EXTERNAL_DOCUMENT',
    sourceId: 'doc_001',
    trustLevel: 'UNTRUSTED',
  },
  metadata: {
    queryComplexity: 3,
    targetSchema: 'finance',
  },
  ...overrides,
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 1 — Valid authenticated event ingestion
// ════════════════════════════════════════════════════════════════════════════════
test('1. Valid authenticated event ingestion returns 201 Security Result', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_valid_01' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);

  assert.equal(res.status, 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`);
  assert.equal(res.body.eventId, 'evt_valid_01');
  assert.ok(res.body.decision, 'Decision field must exist');
  assert.ok(res.body.riskLevel, 'Risk level must exist');
  assert.ok(typeof res.body.trustScore === 'number', 'Trust score must be a number');
  assert.ok(res.body.intent, 'Intent evaluation object must exist');
  assert.ok(res.body.attackChain, 'Attack chain evaluation object must exist');
  assert.ok(res.body.securitySignals, 'Security signals object must exist');
  assert.ok(Array.isArray(res.body.reasons), 'Reasons must be an array');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 2 — Event persisted in database
// ════════════════════════════════════════════════════════════════════════════════
test('2. Event is persisted in agent_events table with all fields', async () => {
  const dbRes = await testPool.query(
    'SELECT * FROM agent_events WHERE event_id_str = $1',
    ['evt_valid_01']
  );
  assert.equal(dbRes.rows.length, 1, 'Event row must be inserted into DB');
  const row = dbRes.rows[0];
  assert.equal(row.event_id_str, 'evt_valid_01');
  assert.equal(row.action, 'database_connector.query');
  assert.equal(row.tool, 'database_connector');
  assert.equal(row.resource, 'NovaCorp_DB');
  assert.equal(row.data_sensitivity, 'HIGH');
  assert.equal(row.reported_auth_status, 'ALLOWED');
  assert.equal(row.required_permission, 'reports.read');
  assert.equal(row.provenance_source_type, 'EXTERNAL_DOCUMENT');
  assert.equal(row.provenance_source_id, 'doc_001');
  assert.equal(row.provenance_trust_level, 'UNTRUSTED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 3 — Public event_id_str returned in API response
// ════════════════════════════════════════════════════════════════════════════════
test('3. Public event_id_str returned in API response', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_public_check' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);
  assert.equal(res.body.eventId, 'evt_public_check');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 4 — Internal UUID not exposed in API response
// ════════════════════════════════════════════════════════════════════════════════
test('4. Internal database UUID is NOT exposed in API response', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_uuid_check' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const bodyStr = JSON.stringify(res.body);
  assert.equal(res.body.id, undefined, 'Internal id must not exist');
  assert.equal(res.body.session_id, undefined, 'Internal session_id must not exist');
  assert.equal(res.body.agent_id, undefined, 'Internal agent_id must not exist');

  const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  assert.ok(!UUID_PATTERN.test(bodyStr), 'Response must not contain raw UUIDs');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 5 — Session relationship correct
// ════════════════════════════════════════════════════════════════════════════════
test('5. Session foreign key correctly resolves and links to session UUID', async () => {
  const dbRes = await testPool.query(
    'SELECT session_id FROM agent_events WHERE event_id_str = $1',
    ['evt_valid_01']
  );
  assert.equal(dbRes.rows[0].session_id, SESS_A_ID, 'session_id must match session UUID');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 6 — Agent relationship correct
// ════════════════════════════════════════════════════════════════════════════════
test('6. Agent foreign key correctly resolves and links to agent UUID', async () => {
  const dbRes = await testPool.query(
    'SELECT agent_id FROM agent_events WHERE event_id_str = $1',
    ['evt_valid_01']
  );
  assert.equal(dbRes.rows[0].agent_id, AGENT_001_ID, 'agent_id must match agent UUID');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 7 — Unknown session rejected
// ════════════════════════════════════════════════════════════════════════════════
test('7. Unknown session is rejected with 404 SESSION_NOT_FOUND', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_unknown_sess', sessionId: 'sess_unknown_999' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, 'SESSION_NOT_FOUND');
  assert.match(res.body.error.message, /sess_unknown_999/);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 8 — Unknown agent rejected
// ════════════════════════════════════════════════════════════════════════════════
test('8. Unknown agent is rejected with 404 AGENT_NOT_FOUND', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_unknown_agent', agentId: 'agent_unknown_999' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 404);
  assert.equal(res.body.error?.code, 'AGENT_NOT_FOUND');
  assert.match(res.body.error.message, /agent_unknown_999/);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 9 — Unauthorized session access rejected (User A accessing User B session)
// ════════════════════════════════════════════════════════════════════════════════
test('9. Ingesting event for another user session is rejected with 403 FORBIDDEN', async () => {
  // User A tries to submit event for User B's session
  const payload = makeValidEventPayload({ eventId: 'evt_unauth_sess', sessionId: 'sess_user_b' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 403);
  assert.equal(res.body.error?.code, 'FORBIDDEN');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 10 — Missing required fields rejected
// ════════════════════════════════════════════════════════════════════════════════
test('10. Missing required fields return 400 VALIDATION_ERROR', async () => {
  const missingAction = makeValidEventPayload({ eventId: 'evt_missing_action', action: '' });
  const resAction = await req('POST', '/api/agent/events', missingAction, tokenA);
  assert.equal(resAction.status, 400);
  assert.equal(resAction.body.error?.code, 'VALIDATION_ERROR');

  const missingTool = makeValidEventPayload({ eventId: 'evt_missing_tool', tool: '' });
  const resTool = await req('POST', '/api/agent/events', missingTool, tokenA);
  assert.equal(resTool.status, 400);
  assert.equal(resTool.body.error?.code, 'VALIDATION_ERROR');

  const missingResource = makeValidEventPayload({ eventId: 'evt_missing_resource', resource: '' });
  const resResource = await req('POST', '/api/agent/events', missingResource, tokenA);
  assert.equal(resResource.status, 400);
  assert.equal(resResource.body.error?.code, 'VALIDATION_ERROR');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 11 — Invalid data sensitivity rejected
// ════════════════════════════════════════════════════════════════════════════════
test('11. Invalid data sensitivity is rejected with 400 VALIDATION_ERROR', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_invalid_sens', dataSensitivity: 'EXTREME' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'VALIDATION_ERROR');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 12 — Invalid reported auth status rejected
// ════════════════════════════════════════════════════════════════════════════════
test('12. Invalid reported auth status is rejected with 400 VALIDATION_ERROR', async () => {
  const payload = makeValidEventPayload({
    eventId: 'evt_invalid_auth_status',
    authorization: { status: 'GRANTED_BY_ADMIN' },
  });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'VALIDATION_ERROR');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 13 — Invalid provenance trust level rejected
// ════════════════════════════════════════════════════════════════════════════════
test('13. Invalid provenance trust level is rejected with 400 VALIDATION_ERROR', async () => {
  const payload = makeValidEventPayload({
    eventId: 'evt_invalid_prov_trust',
    provenance: {
      sourceType: 'USER',
      sourceId: 'src_1',
      trustLevel: 'SUPER_SAFE',
    },
  });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 400);
  assert.equal(res.body.error?.code, 'VALIDATION_ERROR');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 14 — Event metadata validation
// ════════════════════════════════════════════════════════════════════════════════
test('14. Event metadata is validated and preserved as JSONB in DB', async () => {
  const customMetadata = { queryComplexity: 5, targetTable: 'executives', nested: { flag: true } };
  const payload = makeValidEventPayload({
    eventId: 'evt_meta_test',
    metadata: customMetadata,
  });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const dbRes = await testPool.query(
    'SELECT event_metadata FROM agent_events WHERE event_id_str = $1',
    ['evt_meta_test']
  );
  assert.equal(dbRes.rows.length, 1);
  assert.deepEqual(dbRes.rows[0].event_metadata, customMetadata);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 15 — Duplicate event ID handled safely
// ════════════════════════════════════════════════════════════════════════════════
test('15. Duplicate event ID returns 409 DUPLICATE_EVENT', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_duplicate_target' });
  const res1 = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res1.status, 201);

  const res2 = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res2.status, 409);
  assert.equal(res2.body.error?.code, 'DUPLICATE_EVENT');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 16 — Reported permissions stored as evidence
// ════════════════════════════════════════════════════════════════════════════════
test('16. Reported granted permissions are stored verbatim in DB as evidence', async () => {
  const claimedPermissions = ['network.send', 'admin.execute', 'system.shell'];
  const payload = makeValidEventPayload({
    eventId: 'evt_evidence_perm',
    authorization: {
      status: 'ALLOWED',
      requiredPermission: 'admin.execute',
      grantedPermissions: claimedPermissions,
    },
  });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const dbRes = await testPool.query(
    'SELECT reported_granted_permissions FROM agent_events WHERE event_id_str = $1',
    ['evt_evidence_perm']
  );
  assert.deepEqual(dbRes.rows[0].reported_granted_permissions, claimedPermissions);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 17 — Registered agent permissions in agents table are NOT overwritten
// ════════════════════════════════════════════════════════════════════════════════
test('17. Ingesting event with claimed permissions does NOT overwrite agents.permissions', async () => {
  const dbAgentBefore = await testPool.query(
    'SELECT permissions FROM agents WHERE agent_id_str = $1',
    ['agent_001']
  );
  const originalPermissions = dbAgentBefore.rows[0].permissions;

  // Submit event where agent falsely claims 'admin.superuser'
  const payload = makeValidEventPayload({
    eventId: 'evt_tamper_attempt',
    agentId: 'agent_001',
    authorization: {
      status: 'ALLOWED',
      requiredPermission: 'admin.superuser',
      grantedPermissions: ['admin.superuser', 'unrestricted.root'],
    },
  });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const dbAgentAfter = await testPool.query(
    'SELECT permissions FROM agents WHERE agent_id_str = $1',
    ['agent_001']
  );
  assert.deepEqual(
    dbAgentAfter.rows[0].permissions,
    originalPermissions,
    'agents.permissions must remain intact and authoritative'
  );
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 18 — attack_chain_id remains NULL at ingestion
// ════════════════════════════════════════════════════════════════════════════════
test('18. attack_chain_id remains NULL in database at ingestion time', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_no_chain_yet' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const dbRes = await testPool.query(
    'SELECT attack_chain_id FROM agent_events WHERE event_id_str = $1',
    ['evt_no_chain_yet']
  );
  assert.equal(dbRes.rows[0].attack_chain_id, null, 'attack_chain_id must be NULL at ingestion');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 19 — Security decision record is created and linked
// ════════════════════════════════════════════════════════════════════════════════
test('19. Security decision record is created and linked to the ingested event', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_with_sec_dec' });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const dbDecisions = await testPool.query(
    `SELECT d.* FROM security_decisions d
     JOIN agent_events e ON d.event_id = e.id
     WHERE e.event_id_str = 'evt_with_sec_dec'`
  );
  assert.equal(dbDecisions.rows.length, 1, 'security_decisions row must be linked to event');
  assert.ok(dbDecisions.rows[0].decision);
  assert.ok(dbDecisions.rows[0].risk_level);
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 20 — Unauthenticated request rejected
// ════════════════════════════════════════════════════════════════════════════════
test('20. Unauthenticated event request is rejected with 401 UNAUTHORIZED', async () => {
  const payload = makeValidEventPayload({ eventId: 'evt_no_auth' });
  const res = await req('POST', '/api/agent/events', payload, null);
  assert.equal(res.status, 401);
  assert.equal(res.body.error?.code, 'UNAUTHORIZED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 21 — API response matches API_CONTRACT.md structure
// ════════════════════════════════════════════════════════════════════════════════
test('21. POST and GET API responses match API_CONTRACT.md shapes exactly', async () => {
  // POST response check
  const payload = makeValidEventPayload({ eventId: 'evt_contract_check' });
  const postRes = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(postRes.status, 201);

  const expectedPostKeys = [
    'eventId',
    'decision',
    'riskLevel',
    'trustScore',
    'intent',
    'attackChain',
    'securitySignals',
    'reasons',
  ];
  for (const k of expectedPostKeys) {
    assert.ok(postRes.body.hasOwnProperty(k), `POST response missing key ${k}`);
  }

  // GET response check
  const getRes = await req('GET', '/api/agent/events?sessionId=sess_user_a', null, tokenA);
  assert.equal(getRes.status, 200);
  assert.ok(Array.isArray(getRes.body.events), 'GET response must have events array');
  assert.ok(getRes.body.events.length > 0, 'Must return ingested events for User A');

  const evt = getRes.body.events.find(e => e.eventId === 'evt_contract_check');
  assert.ok(evt, 'Ingested event must be in telemetry list');
  assert.equal(evt.sessionId, 'sess_user_a');
  assert.equal(evt.agentId, 'agent_001');
  assert.equal(evt.action, 'database_connector.query');
  assert.equal(evt.dataSensitivity, 'HIGH');
  assert.ok(evt.authorization);
  assert.equal(evt.authorization.status, 'ALLOWED');
  assert.ok(evt.provenance);
  assert.equal(evt.provenance.trustLevel, 'UNTRUSTED');
});

// ════════════════════════════════════════════════════════════════════════════════
// Test 22 — Parent agent linkage support
// ════════════════════════════════════════════════════════════════════════════════
test('22. Parent agent ID is validated and linked to parent_agent_id in DB', async () => {
  const payload = makeValidEventPayload({
    eventId: 'evt_sub_agent',
    agentId: 'agent_002',
    parentAgentId: 'agent_001',
  });
  const res = await req('POST', '/api/agent/events', payload, tokenA);
  assert.equal(res.status, 201);

  const dbRes = await testPool.query(
    'SELECT parent_agent_id FROM agent_events WHERE event_id_str = $1',
    ['evt_sub_agent']
  );
  assert.equal(dbRes.rows[0].parent_agent_id, AGENT_001_ID);

  const getRes = await req('GET', '/api/agent/events?sessionId=sess_user_a', null, tokenA);
  const subEvt = getRes.body.events.find(e => e.eventId === 'evt_sub_agent');
  assert.equal(subEvt.parentAgentId, 'agent_001');
});
