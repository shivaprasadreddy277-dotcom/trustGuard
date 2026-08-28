/**
 * TrustGuard — Cycle 5 Simulation & Demonstration Test Suite
 *
 * Tests the real-time simulation engine, scenario execution through Cycle 3
 * security engines and Cycle 4 attack chain correlation, persistence in
 * simulation_runs, API endpoints, and user ownership boundaries.
 */
'use strict';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test_secret_for_simulation_tests_12345';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const { newDb } = require('pg-mem');

// ── In-Memory PostgreSQL Mock with Full Schema ───────────────────────────────
const db = newDb();
const crypto = require('crypto');

db.public.registerFunction({
  name: 'gen_random_uuid',
  returns: db.public.getType('uuid'),
  implementation: () => crypto.randomUUID(),
});

db.public.registerFunction({
  name: 'uuid_generate_v4',
  returns: db.public.getType('uuid'),
  implementation: () => crypto.randomUUID(),
});

const testPool = new (db.adapters.createPg().Pool)();

const SCHEMA_PATH = path.resolve(__dirname, '../../db/schema.sql');
const rawSchema = fs.readFileSync(SCHEMA_PATH, 'utf8')
  .replace(/CREATE EXTENSION.*?;/gi, '')
  .replace(/gen_random_uuid\(\)/g, 'uuid_generate_v4()');

const USER_A_ID = '11111111-1111-1111-1111-111111111111';
const USER_B_ID = '22222222-2222-2222-2222-222222222222';
const AGENT_001_ID = '33333333-3333-3333-3333-333333333333';

const SEED_SQL = `
  INSERT INTO users (id, user_id_str, username, name, email, password_hash) VALUES
  ('${USER_A_ID}', 'usr_0001', 'alice_sec', 'Alice Sec', 'alice@sec.test', '$2b$10$dummy'),
  ('${USER_B_ID}', 'usr_0002', 'bob_dev', 'Bob Dev', 'bob@dev.test', '$2b$10$dummy');

  INSERT INTO agents (id, agent_id_str, name, description, declared_objective, permissions, status, current_trust_score) VALUES
  ('${AGENT_001_ID}', 'agent_001', 'NovaCorp Financial Analyst', 'Assists queries', 'Analyze monthly metrics.', ARRAY['file.read', 'db.read', 'llm.evaluate', 'reports.read', 'agent.delegate'], 'ACTIVE', 100);
`;

testPool.query(rawSchema)
  .then(() => testPool.query(SEED_SQL))
  .catch((err) => {
    console.error('[Simulation Test DB Setup Error]', err.message);
    process.exit(1);
  });

// ── Inject mock pool into require cache ──────────────────────────────────────
const poolPath = require.resolve('../db/pool');
require.cache[poolPath] = {
  id: poolPath,
  filename: poolPath,
  loaded: true,
  exports: testPool,
};

// ── Load App & Generate Test JWTs ───────────────────────────────────────────
const app = require('../app');

const tokenUserA = jwt.sign(
  { userId: USER_A_ID, userIdStr: 'usr_test_a', username: 'user_a', email: 'usera@trustguard.test' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

const tokenUserB = jwt.sign(
  { userId: USER_B_ID, userIdStr: 'usr_test_b', username: 'user_b', email: 'userb@trustguard.test' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

function request(method, urlPath, body, token) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const server = http.createServer(app);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      const opts = { hostname: '127.0.0.1', port, path: urlPath, method, headers };
      const req = http.request(opts, (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          server.close();
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, body: data });
          }
        });
      });
      req.on('error', (e) => {
        server.close();
        reject(e);
      });
      if (payload) req.write(payload);
      req.end();
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CYCLE 5 SIMULATION TESTS
// ─────────────────────────────────────────────────────────────────────────────

test('1. GET /api/simulation/scenarios lists all available scenarios', async () => {
  const res = await request('GET', '/api/simulation/scenarios', null, tokenUserA);
  assert.equal(res.status, 200);
  assert.ok(Array.isArray(res.body.scenarios));
  assert.equal(res.body.scenarios.length, 5);

  const scenarioIds = res.body.scenarios.map((s) => s.scenarioId);
  assert.ok(scenarioIds.includes('normal_workflow'));
  assert.ok(scenarioIds.includes('indirect_injection'));
  assert.ok(scenarioIds.includes('intent_drift'));
  assert.ok(scenarioIds.includes('unauthorized_sensitive_access'));
  assert.ok(scenarioIds.includes('compound_attack'));
});

test('2. Unauthenticated simulation requests return 401 UNAUTHORIZED', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'normal_workflow' }, null);
  assert.equal(res.status, 401);
});

test('3. Unknown scenario request returns 400 UNKNOWN_SCENARIO', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'fake_scenario_xyz' }, tokenUserA);
  assert.equal(res.status, 400);
  assert.equal(res.body.error.code, 'UNKNOWN_SCENARIO');
});

test('4. Scenario 1: normal_workflow runs and yields ALLOW decision with no attack chain', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'normal_workflow' }, tokenUserA);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'COMPLETED');
  assert.equal(res.body.scenarioId, 'normal_workflow');
  assert.equal(res.body.executionSummary.finalVerdict, 'ALLOW');
  assert.equal(res.body.executionSummary.attackChainDetected, false);
  assert.equal(res.body.events.length, 1);
  assert.ok(res.body.simulationId.startsWith('sim_'));
});

test('5. Scenario 2: unauthorized_sensitive_access triggers policy violation and BLOCK', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'unauthorized_sensitive_access' }, tokenUserA);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'COMPLETED');
  assert.equal(res.body.executionSummary.finalVerdict, 'BLOCK');
  assert.equal(res.body.decisions[0].securitySignals.policyViolation, true);
  assert.equal(res.body.decisions[0].decision, 'BLOCK');
});

test('6. Scenario 3: indirect_injection flags untrusted provenance and prompt influence', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'indirect_injection' }, tokenUserA);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'COMPLETED');
  assert.equal(res.body.events.length, 2);
  assert.equal(res.body.decisions[0].securitySignals.provenanceRisk, 'HIGH');
});

test('7. Scenario 4: intent_drift flags intent drift on sensitive credential access', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'intent_drift' }, tokenUserA);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'COMPLETED');
  assert.equal(res.body.events.length, 2);

  const step2Dec = res.body.decisions[1];
  assert.equal(step2Dec.intent.status, 'DRIFT');
  assert.ok(step2Dec.intent.alignmentScore < 0.6);
});

test('8. Scenario 5: compound_attack executes 5 real events and correlates CRITICAL attack chain', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'compound_attack' }, tokenUserA);
  assert.equal(res.status, 201);
  assert.equal(res.body.status, 'COMPLETED');
  assert.equal(res.body.events.length, 5);
  assert.equal(res.body.executionSummary.totalEventsIngested, 5);
  assert.equal(res.body.executionSummary.finalVerdict, 'BLOCK');
  assert.equal(res.body.executionSummary.attackChainDetected, true);
  assert.equal(res.body.executionSummary.attackChainSeverity, 'CRITICAL');
  assert.ok(res.body.executionSummary.attackChainId.startsWith('chain_'));

  // Verify alert creation
  assert.equal(res.body.executionSummary.alertCreated, true);
  assert.ok(res.body.alert);
  assert.equal(res.body.alert.severity, 'CRITICAL');
  assert.equal(res.body.alert.type, 'ATTACK_CHAIN_DETECTED');
});

test('9. Simulation record is persisted in simulation_runs table with COMPLETED status', async () => {
  const res = await request('POST', '/api/simulation/run', { scenarioId: 'normal_workflow' }, tokenUserA);
  const simId = res.body.simulationId;

  const dbRes = await testPool.query('SELECT * FROM simulation_runs WHERE simulation_id_str = $1', [simId]);
  assert.equal(dbRes.rows.length, 1);
  assert.equal(dbRes.rows[0].status, 'COMPLETED');
  assert.equal(dbRes.rows[0].total_events, 1);
  assert.equal(dbRes.rows[0].final_decision, 'ALLOW');
});

test('10. GET /api/simulation/runs/:simulationId retrieves full execution report', async () => {
  const runRes = await request('POST', '/api/simulation/run', { scenarioId: 'compound_attack' }, tokenUserA);
  const simId = runRes.body.simulationId;

  const getRes = await request('GET', `/api/simulation/runs/${simId}`, null, tokenUserA);
  assert.equal(getRes.status, 200);
  assert.equal(getRes.body.simulationId, simId);
  assert.equal(getRes.body.scenarioId, 'compound_attack');
  assert.equal(getRes.body.status, 'COMPLETED');
  assert.equal(getRes.body.events.length, 5);
  assert.equal(getRes.body.executionSummary.attackChainDetected, true);
  assert.equal(getRes.body.executionSummary.attackChainSeverity, 'CRITICAL');
});

test('11. User B cannot access User A simulation run (ownership boundary)', async () => {
  const runRes = await request('POST', '/api/simulation/run', { scenarioId: 'normal_workflow' }, tokenUserA);
  const simId = runRes.body.simulationId;

  const forbiddenRes = await request('GET', `/api/simulation/runs/${simId}`, null, tokenUserB);
  assert.equal(forbiddenRes.status, 403);
  assert.equal(forbiddenRes.body.error.code, 'FORBIDDEN');
});

test('12. GET /api/simulation/runs/sim_nonexistent returns 404', async () => {
  const res = await request('GET', '/api/simulation/runs/sim_unknown_123', null, tokenUserA);
  assert.equal(res.status, 404);
  assert.equal(res.body.error.code, 'SIMULATION_NOT_FOUND');
});

test('13. GET /api/simulation/runs lists operator simulations in reverse chronological order', async () => {
  const listRes = await request('GET', '/api/simulation/runs', null, tokenUserA);
  assert.equal(listRes.status, 200);
  assert.ok(Array.isArray(listRes.body.simulations));
  assert.ok(listRes.body.simulations.length >= 4);

  // Check descending chronological order
  for (let i = 1; i < listRes.body.simulations.length; i++) {
    const prevTime = new Date(listRes.body.simulations[i - 1].startedAt).getTime();
    const currTime = new Date(listRes.body.simulations[i].startedAt).getTime();
    assert.ok(prevTime >= currTime);
  }
});

test('14. Public identifiers used: DB UUIDs never exposed in simulation responses', async () => {
  const runRes = await request('POST', '/api/simulation/run', { scenarioId: 'compound_attack' }, tokenUserA);
  assert.ok(runRes.body.simulationId.startsWith('sim_'));
  assert.ok(runRes.body.sessionId.startsWith('sess_sim_'));
  assert.equal(runRes.body.id, undefined);
  assert.equal(runRes.body.session_id, undefined);
  assert.equal(runRes.body.user_id, undefined);
});
