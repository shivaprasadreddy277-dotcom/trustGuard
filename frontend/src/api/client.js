/**
 * TrustGuard Frontend API Service Layer
 * Centralized client for all communication with the real backend.
 */

const API_BASE = '/api';

/**
 * Helper to make authenticated HTTP requests.
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('trustguard_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  let data;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const error = new Error(data?.error?.message || `HTTP error ${response.status}`);
    error.status = response.status;
    error.code = data?.error?.code || 'UNKNOWN_ERROR';
    error.data = data;
    throw error;
  }

  return data;
}

// ── Auth APIs ────────────────────────────────────────────────────────────────
export const authApi = {
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),

  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  googleLogin: (credentialData) =>
    request('/auth/google', {
      method: 'POST',
      body: JSON.stringify(credentialData),
    }),

  getMe: () => request('/auth/me', { method: 'GET' }),

  getHealth: () => request('/health', { method: 'GET' }),
};

// ── Agents APIs ──────────────────────────────────────────────────────────────
export const agentsApi = {
  listAgents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/agents${qs}`, { method: 'GET' });
  },

  getAgent: (agentId) =>
    request(`/agents/${encodeURIComponent(agentId)}`, { method: 'GET' }),

  getAgentTrust: (agentId, limit = 50) =>
    request(`/agents/${encodeURIComponent(agentId)}/trust?limit=${limit}`, {
      method: 'GET',
    }),
};

// ── Sessions APIs ────────────────────────────────────────────────────────────
export const sessionsApi = {
  createSession: (sessionData) =>
    request('/sessions', {
      method: 'POST',
      body: JSON.stringify(sessionData),
    }),

  getSession: (sessionId) =>
    request(`/sessions/${encodeURIComponent(sessionId)}`, { method: 'GET' }),
};

// ── Agent Events & Telemetry APIs ────────────────────────────────────────────
export const eventsApi = {
  ingestEvent: (eventPayload) =>
    request('/agent/events', {
      method: 'POST',
      body: JSON.stringify(eventPayload),
    }),

  listEvents: (params = {}) => {
    const query = new URLSearchParams();
    if (params.sessionId) query.append('sessionId', params.sessionId);
    if (params.agentId) query.append('agentId', params.agentId);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/agent/events${qs}`, { method: 'GET' });
  },
};

// ── Security Intelligence APIs (Cycle 3 & 4) ─────────────────────────────────
export const securityApi = {
  getDecision: (eventId) =>
    request(`/security/decisions/${encodeURIComponent(eventId)}`, { method: 'GET' }),

  listAttackChains: () =>
    request('/security/attack-chains', { method: 'GET' }),

  getAttackChain: (chainId) =>
    request(`/security/attack-chains/${encodeURIComponent(chainId)}`, { method: 'GET' }),

  listAlerts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.resolved !== undefined) query.append('resolved', params.resolved);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/security/alerts${qs}`, { method: 'GET' });
  },
};

export const attackChainsApi = {
  listChains: () => request('/security/attack-chains', { method: 'GET' }),
  getChain: (chainId) => request(`/security/attack-chains/${encodeURIComponent(chainId)}`, { method: 'GET' }),
};

export const alertsApi = {
  listAlerts: (params = {}) => {
    const query = new URLSearchParams();
    if (params.resolved !== undefined) query.append('resolved', params.resolved);
    if (params.limit) query.append('limit', params.limit);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return request(`/security/alerts${qs}`, { method: 'GET' });
  },
};

// ── Security Simulation APIs (Cycle 5) ───────────────────────────────────────
export const simulationApi = {
  getScenarios: () => request('/simulation/scenarios', { method: 'GET' }),
  runSimulation: (scenarioId) =>
    request('/simulation/run', {
      method: 'POST',
      body: JSON.stringify({ scenarioId }),
    }),
  getSimulation: (simulationId) =>
    request(`/simulation/runs/${encodeURIComponent(simulationId)}`, { method: 'GET' }),
  listRuns: (limit = 20) =>
    request(`/simulation/runs?limit=${limit}`, { method: 'GET' }),
};

