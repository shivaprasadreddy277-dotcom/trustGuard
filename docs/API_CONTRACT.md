# TrustGuard — API Contract Specification
### Stable Frontend-Backend API Boundaries for the TrustGuard MVP

This document outlines the API contracts between the TrustGuard frontend dashboard and the security backend authority.

---

## Shared Data Objects

### 1. Agent Event Object
Sent by intercepted agents or simulators to TrustGuard to query if an action is safe.
```json
{
  "eventId": "evt_01j6abc123",
  "sessionId": "sess_9988",
  "agentId": "agent_001",
  "parentAgentId": null,
  "timestamp": "2026-08-27T21:10:00Z",
  "action": "database_connector.query",
  "tool": "database_connector",
  "resource": "NovaCorp_DB",
  "dataSensitivity": "HIGH",
  "authorization": {
    "status": "ALLOWED",
    "requiredPermission": "reports.read",
    "grantedPermissions": [
      "reports.read"
    ]
  },
  "provenance": {
    "sourceType": "EXTERNAL_DOCUMENT",
    "sourceId": "doc_001",
    "trustLevel": "UNTRUSTED"
  }
}
```
*   **eventId:** String (UUID/ULID format). Unique identifier of the event.
*   **sessionId:** String. Unique identifier of the agent execution session.
*   **agentId:** String. Unique identifier of the AI agent.
*   **parentAgentId:** String or `null`. ID of the parent agent if the event occurs within a sub-agent execution context.
*   **timestamp:** ISO-8601 Date String. When the event occurred.
*   **action:** String. Action name or command description (e.g., `list_dir`, `query`).
*   **tool:** String. The name of the tool/system being utilized.
*   **resource:** String. The target file, API endpoint, or database table.
*   **dataSensitivity:** String Enum. Allowed values: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
*   **authorization:** Structured object containing authorization claims.
    *   `status`: String Enum. Allowed values: `ALLOWED`, `DENIED`, `UNKNOWN`.
    *   `requiredPermission`: String. The permission token required for the tool/action.
    *   `grantedPermissions`: Array of Strings. The permission tokens claimed to be held by the agent session.
    *   > [!IMPORTANT]
    *   > **Security Trust Boundary Rule:**
    *   > * **The `authorization.status` received in this event is NOT trusted as the final authorization decision.** It represents the status claimed by the agent or client wrapper.
    *   > * **The backend Policy Engine must independently calculate the actual authorization status** by verifying the requested `requiredPermission` against the registered agent's verified permissions in the backend authority.
    *   > * Security-critical authorization must be evaluated deterministically by the backend. The frontend dashboard must never determine authorization or make security decisions.
*   **provenance:** Structured object representing the origin of the directive, helping detect prompt injection and indirect injection.
    *   `sourceType`: String Enum. Allowed values: `USER`, `SYSTEM_POLICY`, `APPROVED_KNOWLEDGE`, `INTERNAL_DOCUMENT`, `EXTERNAL_DOCUMENT`, `ANOTHER_AGENT`.
    *   `sourceId`: String. Unique ID or URI of the source context (e.g., `doc_001`, `prompt_user_02`).
    *   `trustLevel`: String Enum. Allowed values: `TRUSTED`, `MEDIUM`, `UNTRUSTED`.

### 2. Security Result Object
Returned by TrustGuard after evaluating an `Agent Event`.
```json
{
  "eventId": "evt_01j6abc123",
  "decision": "BLOCK",
  "riskLevel": "CRITICAL",
  "trustScore": 45,
  "intent": {
    "status": "DRIFT",
    "alignmentScore": 0.12
  },
  "attackChain": {
    "detected": true,
    "severity": "HIGH",
    "chainId": "chain_abc123"
  },
  "securitySignals": {
    "policyViolation": false,
    "intentDrift": true,
    "provenanceRisk": "HIGH",
    "dataSensitivity": "HIGH",
    "attackChainRisk": "HIGH"
  },
  "reasons": [
    "Intent status changed to DRIFT (0.12 alignment score)",
    "Data sensitivity HIGH combined with high risk action",
    "Attack chain detected: chain_abc123",
    "Provenance trust level is UNTRUSTED from external document"
  ]
}
```
*   **eventId:** String. Identifies the corresponding evaluated event.
*   **decision:** String Enum. Allowed values: `ALLOW`, `REVIEW`, `BLOCK`.
*   **riskLevel:** String Enum. Allowed values: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
*   **trustScore:** Integer (0–100). The recalculated trust reputation score of the session.
*   **intent.status:** String Enum. Allowed values: `ALIGNED`, `DRIFT`, `UNKNOWN`.
*   **intent.alignmentScore:** Number (0.0 - 1.0). Intent similarity or safety confidence score.
*   **attackChain.detected:** Boolean. Whether the sequence of events is flagged as a stateful attack chain.
*   **attackChain.severity:** String Enum. Allowed values: `NONE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
*   **attackChain.chainId:** String or `null`. ID of the associated stateful chain if detected.
*   **securitySignals:** Breakdown of the evaluation indicators to keep the verdict explainable.
    *   `policyViolation`: Boolean.
    *   `intentDrift`: Boolean.
    *   `provenanceRisk`: String Enum. Allowed values: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
    *   `dataSensitivity`: String Enum. Allowed values: `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
    *   `attackChainRisk`: String Enum. Allowed values: `NONE`, `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`.
*   **reasons:** Array of Strings. Explanation text for the decision verdict.

### 3. Session Intent Mapping Object
Maps an active session to its original user prompt and objectives. Used by the Intent Engine to monitor alignment over time.
```json
{
  "sessionId": "sess_9988",
  "originalIntent": "Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary."
}
```
*   **sessionId:** String. Unique session identifier.
*   **originalIntent:** String. The original prompt or objective set by the user at the start of the session.

---

## Standard Error Format
All failure responses must use this structure:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable explanation of the error."
  }
}
```

---

## API Endpoints List

### 1. Authentication Endpoints

#### `POST /api/auth/register`
*   **Purpose:** Register a new console operator/developer profile.
*   **Authentication Requirement:** None (Public)
*   **Request Body (JSON):**
    ```json
    {
      "username": "alex_dev",
      "email": "alex@novacorp.com",
      "password": "SuperSecretPassword123!"
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "user": {
        "id": "usr_9018",
        "username": "alex_dev",
        "email": "alex@novacorp.com",
        "createdAt": "2026-08-27T21:18:13Z"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token_signature"
    }
    ```
*   **HTTP Status Codes:**
    *   `201 Created` - User successfully registered.
    *   `400 Bad Request` - Validation failures or email already exists.
*   **Error Example (400):**
    ```json
    {
      "error": {
        "code": "EMAIL_ALREADY_EXISTS",
        "message": "A user with this email address already exists."
      }
    }
    ```

#### `POST /api/auth/login`
*   **Purpose:** Authenticate operator credentials and generate a JWT bearer token.
*   **Authentication Requirement:** None (Public)
*   **Request Body (JSON):**
    ```json
    {
      "email": "alex@novacorp.com",
      "password": "SuperSecretPassword123!"
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "user": {
        "id": "usr_9018",
        "username": "alex_dev",
        "email": "alex@novacorp.com"
      },
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy_token_signature"
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Authentication successful.
    *   `401 Unauthorized` - Invalid email or password.
*   **Error Example (401):**
    ```json
    {
      "error": {
        "code": "INVALID_CREDENTIALS",
        "message": "Invalid email or password."
      }
    }
    ```

#### `GET /api/auth/me`
*   **Purpose:** Retrieve info about the current logged-in operator session.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Body:** None
*   **Response Body (JSON):**
    ```json
    {
      "user": {
        "id": "usr_9018",
        "username": "alex_dev",
        "email": "alex@novacorp.com",
        "createdAt": "2026-08-27T21:18:13Z"
      }
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Token is invalid, missing, or expired.
*   **Error Example (401):**
    ```json
    {
      "error": {
        "code": "UNAUTHORIZED",
        "message": "Authorization token is missing or has expired."
      }
    }
    ```

---

### 2. System Endpoints

#### `GET /api/health`
*   **Purpose:** Check service availability and system dependency health.
*   **Authentication Requirement:** None (Public)
*   **Request Body:** None
*   **Response Body (JSON):**
    ```json
    {
      "status": "healthy",
      "timestamp": "2026-08-27T21:20:00Z",
      "version": "1.0.0"
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Service operational.
    *   `503 Service Unavailable` - Core database or internal checks failing.

---

### 3. Agent Monitoring Endpoints

#### `GET /api/agents`
*   **Purpose:** Get lists of registered agents monitored by TrustGuard.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Query):**
    *   `status`: Optional string filter (`ACTIVE`, `SUSPENDED`).
*   **Response Body (JSON):**
    ```json
    {
      "agents": [
        {
          "agentId": "agent_001",
          "name": "NovaCorp Customer Support Agent",
          "status": "ACTIVE",
          "currentTrustScore": 95,
          "declaredObjective": "Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.",
          "createdAt": "2026-08-27T20:00:00Z"
        },
        {
          "agentId": "agent_002",
          "name": "NovaCorp DevOps Agent",
          "status": "SUSPENDED",
          "currentTrustScore": 32,
          "declaredObjective": "Maintain system resources and report security health logs.",
          "createdAt": "2026-08-27T20:15:00Z"
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.

#### `GET /api/agents/:agentId`
*   **Purpose:** Get profile and configuration variables of a specific agent.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Path):**
    *   `agentId`: String. Unique ID of the agent.
*   **Response Body (JSON):**
    ```json
    {
      "agent": {
        "agentId": "agent_001",
        "name": "NovaCorp Customer Support Agent",
        "description": "Assists customer queries and order searches.",
        "status": "ACTIVE",
        "currentTrustScore": 95,
        "declaredObjective": "Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary.",
        "createdAt": "2026-08-27T20:00:00Z"
      }
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.
    *   `404 Not Found` - Agent not found.
*   **Error Example (404):**
    ```json
    {
      "error": {
        "code": "AGENT_NOT_FOUND",
        "message": "Agent with ID agent_999 was not found."
      }
    }
    ```

#### `GET /api/agents/:agentId/trust`
*   **Purpose:** Fetch the trust score logs and status degradation history of an agent.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Path):**
    *   `agentId`: String. Unique ID of the agent.
*   **Request Parameters (Query):**
    *   `limit`: Optional integer. Defaults to 50.
*   **Response Body (JSON):**
    ```json
    {
      "agentId": "agent_001",
      "currentTrustScore": 95,
      "history": [
        {
          "timestamp": "2026-08-27T21:10:00Z",
          "score": 95,
          "reason": "Initial score restored"
        },
        {
          "timestamp": "2026-08-27T21:05:00Z",
          "score": 75,
          "reason": "Anomalous tool call detected: list_dir"
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.
    *   `404 Not Found` - Agent not found.

---

### 4. Session Management Endpoints

#### `POST /api/sessions`
*   **Purpose:** Initialize a new agent execution session with its original intent.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Body (JSON):**
    ```json
    {
      "originalIntent": "Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary."
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "sessionId": "sess_9988",
      "originalIntent": "Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary."
    }
    ```
*   **HTTP Status Codes:**
    *   `201 Created` - Session successfully registered.
    *   `400 Bad Request` - Missing `originalIntent` parameter.
    *   `401 Unauthorized` - Invalid token.
*   **Error Example (400):**
    ```json
    {
      "error": {
        "code": "MISSING_INTENT",
        "message": "The field 'originalIntent' is required to initialize a session."
      }
    }
    ```

#### `GET /api/sessions/:sessionId`
*   **Purpose:** Retrieve session details including the original intent mapping.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Path):**
    *   `sessionId`: String. Unique ID of the session.
*   **Response Body (JSON):**
    ```json
    {
      "sessionId": "sess_9988",
      "originalIntent": "Analyze NovaCorp Q2 and Q3 reports and prepare an executive summary."
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Session details retrieved successfully.
    *   `401 Unauthorized` - Invalid token.
    *   `404 Not Found` - Session not found.
*   **Error Example (404):**
    ```json
    {
      "error": {
        "code": "SESSION_NOT_FOUND",
        "message": "Session with ID sess_9988 was not found."
      }
    }
    ```

---

### 5. Event & Telemetry Endpoints

#### `POST /api/agent/events`
*   **Purpose:** Ingests telemetry about an agent's runtime step/activity, runs evaluations, and returns the Security Result.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Body (JSON):** Matches fields of the shared `Agent Event` object.
    ```json
    {
      "eventId": "evt_01j6abc123",
      "sessionId": "sess_9988",
      "agentId": "agent_001",
      "parentAgentId": null,
      "timestamp": "2026-08-27T21:10:00Z",
      "action": "database_connector.query",
      "tool": "database_connector",
      "resource": "NovaCorp_DB",
      "dataSensitivity": "HIGH",
      "authorization": {
        "status": "ALLOWED",
        "requiredPermission": "reports.read",
        "grantedPermissions": [
          "reports.read"
        ]
      },
      "provenance": {
        "sourceType": "EXTERNAL_DOCUMENT",
        "sourceId": "doc_001",
        "trustLevel": "UNTRUSTED"
      }
    }
    ```
*   **Response Body (JSON):** Matches fields of the shared `Security Result` object.
    ```json
    {
      "eventId": "evt_01j6abc123",
      "decision": "BLOCK",
      "riskLevel": "CRITICAL",
      "trustScore": 45,
      "intent": {
        "status": "DRIFT",
        "alignmentScore": 0.12
      },
      "attackChain": {
        "detected": true,
        "severity": "HIGH",
        "chainId": "chain_abc123"
      },
      "securitySignals": {
        "policyViolation": false,
        "intentDrift": true,
        "provenanceRisk": "HIGH",
        "dataSensitivity": "HIGH",
        "attackChainRisk": "HIGH"
      },
      "reasons": [
        "Intent status changed to DRIFT (0.12 alignment score)",
        "Data sensitivity HIGH combined with high risk action",
        "Attack chain detected: chain_abc123",
        "Provenance trust level is UNTRUSTED from external document"
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `201 Created` - Evaluation completed and result generated.
    *   `400 Bad Request` - Event validation error.
    *   `401 Unauthorized` - Invalid token.

#### `GET /api/agent/events`
*   **Purpose:** Fetch historic telemetry logs and action streams for audit.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Query):**
    *   `sessionId`: Optional string filter.
    *   `agentId`: Optional string filter.
    *   `limit`: Optional integer. Defaults to 50.
*   **Response Body (JSON):**
    ```json
    {
      "events": [
        {
          "eventId": "evt_01j6abc123",
          "sessionId": "sess_9988",
          "agentId": "agent_001",
          "parentAgentId": null,
          "timestamp": "2026-08-27T21:10:00Z",
          "action": "database_connector.query",
          "tool": "database_connector",
          "resource": "NovaCorp_DB",
          "dataSensitivity": "HIGH",
          "authorization": {
            "status": "ALLOWED",
            "requiredPermission": "reports.read",
            "grantedPermissions": [
              "reports.read"
            ]
          },
          "provenance": {
            "sourceType": "EXTERNAL_DOCUMENT",
            "sourceId": "doc_001",
            "trustLevel": "UNTRUSTED"
          }
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.

---

### 6. Security & Threat Intelligence Endpoints

#### `GET /api/security/alerts`
*   **Purpose:** Retrieve a list of aggregated threat alerts generated by engines (verdict BLOCK or REVIEW, or high risk anomalies).
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Query):**
    *   `resolved`: Optional boolean (defaults to all).
    *   `limit`: Optional integer.
*   **Response Body (JSON):**
    ```json
    {
      "alerts": [
        {
          "alertId": "al_88329",
          "eventId": "evt_01j6abc123",
          "timestamp": "2026-08-27T21:10:00Z",
          "agentId": "agent_001",
          "severity": "HIGH",
          "type": "ATTACK_CHAIN_DETECTED",
          "message": "Potential privilege escalation: multi-step file manipulation detected",
          "resolved": false
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.

#### `GET /api/security/decisions/:eventId`
*   **Purpose:** Retrieve full analysis and engine breakdown for a specific event decision.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Path):**
    *   `eventId`: String. ID of the target event.
*   **Response Body (JSON):** Matches fields of the shared `Security Result` object.
    ```json
    {
      "eventId": "evt_01j6abc123",
      "decision": "BLOCK",
      "riskLevel": "CRITICAL",
      "trustScore": 45,
      "intent": {
        "status": "DRIFT",
        "alignmentScore": 0.12
      },
      "attackChain": {
        "detected": true,
        "severity": "HIGH",
        "chainId": "chain_abc123"
      },
      "securitySignals": {
        "policyViolation": false,
        "intentDrift": true,
        "provenanceRisk": "HIGH",
        "dataSensitivity": "HIGH",
        "attackChainRisk": "HIGH"
      },
      "reasons": [
        "Intent status changed to DRIFT (0.12 alignment score)",
        "Data sensitivity HIGH combined with high risk action",
        "Attack chain detected: chain_abc123",
        "Provenance trust level is UNTRUSTED from external document"
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.
    *   `404 Not Found` - Decision not found for given event ID.

#### `GET /api/security/attack-chains/:chainId`
*   **Purpose:** Get details of a detected stateful attack chain, listing the historical event steps in sequence.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Parameters (Path):**
    *   `chainId`: String. ID of the detected chain.
*   **Response Body (JSON):**
    ```json
    {
      "chainId": "chain_abc123",
      "detectedAt": "2026-08-27T21:10:00Z",
      "severity": "HIGH",
      "events": [
        {
          "eventId": "evt_01j6abc111",
          "timestamp": "2026-08-27T21:08:00Z",
          "tool": "file_system",
          "action": "list_dir",
          "resource": "./config"
        },
        {
          "eventId": "evt_01j6abc122",
          "timestamp": "2026-08-27T21:09:00Z",
          "tool": "file_system",
          "action": "view_file",
          "resource": "./config/secrets.json"
        },
        {
          "eventId": "evt_01j6abc123",
          "timestamp": "2026-08-27T21:10:00Z",
          "tool": "http_client",
          "action": "http_post",
          "resource": "https://malicious-external-domain.com/exfiltrate"
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.
    *   `404 Not Found` - Attack chain not found.

---

### 7. Dashboard Endpoints

#### `GET /api/dashboard/overview`
*   **Purpose:** High-level metrics to render the security console home dashboard.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Response Body (JSON):**
    ```json
    {
      "totalEventsProcessed": 10543,
      "totalAlerts": 14,
      "blockedActions": 8,
      "reviewRequired": 6,
      "averageAgentTrustScore": 92.4,
      "activeSessionsCount": 3,
      "recentSecurityIncidents": [
        {
          "incidentId": "inc_001",
          "timestamp": "2026-08-27T21:10:00Z",
          "agentId": "agent_001",
          "severity": "HIGH",
          "description": "Blocked HTTP Exfiltration from NovaCorp Customer Support Agent"
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.

---

### 8. Simulation & Demo Controls Endpoints

#### `GET /api/simulation/scenarios`
*   **Purpose:** Fetch the list of available interactive mock security attack scenarios mapped to the TrustGuard MVP user story.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Response Body (JSON):**
    ```json
    {
      "scenarios": [
        {
          "scenarioId": "normal_workflow",
          "name": "A. Normal Workflow",
          "description": "Agent performs regular analytical tasks within its defined role limits.",
          "expectedDecision": "ALLOW",
          "steps": [
            "User prompts agent to summarize monthly metrics",
            "Agent accesses approved database resource",
            "TrustGuard validates intent alignment and returns ALLOW"
          ]
        },
        {
          "scenarioId": "indirect_injection",
          "name": "B. Indirect Prompt Injection",
          "description": "Agent reads an untrusted external document which contains hidden malicious payload instructions.",
          "expectedDecision": "BLOCK",
          "steps": [
            "User prompts agent to read external_document.txt",
            "Agent ingests file containing indirect injection rules",
            "TrustGuard flags provenance risk (UNTRUSTED) and suspicious intent shift, blocking the payload execution"
          ]
        },
        {
          "scenarioId": "intent_drift",
          "name": "C. Intent Drift",
          "description": "Agent begins executing tools and commands that drift away from the original user objective.",
          "expectedDecision": "REVIEW",
          "steps": [
            "Agent session starts with task to review performance logs",
            "Agent unexpectedly attempts to search employee address logs",
            "TrustGuard Intent Engine identifies DRIFT and triggers a REVIEW state or blocks depending on severity threshold"
          ]
        },
        {
          "scenarioId": "unauthorized_sensitive_access",
          "name": "D. Unauthorized Sensitive Access",
          "description": "Agent attempts to access high-sensitivity resources without proper system permissions.",
          "expectedDecision": "BLOCK",
          "steps": [
            "Agent executes tool to query admin billing table",
            "Policy Engine independently verifies that the registered agent does not possess the required 'admin.write' permission.",
            "TrustGuard intercepts action immediately with policy violation BLOCK"
          ]
        },
        {
          "scenarioId": "compound_attack",
          "name": "E. Compound Attack",
          "description": "Multi-step complex exploit chain spanning untrusted document reading, intent drift, sensitive resource request, agent delegation, and exfiltration attempt.",
          "expectedDecision": "BLOCK",
          "steps": [
            "Agent reads untrusted config file",
            "Agent undergoes severe intent drift",
            "Agent requests sensitive admin database records",
            "Agent delegates task to a sub-agent to bypass checks",
            "Sub-agent attempts external HTTP exfiltration",
            "Attack-Chain Intelligence correlates sequence, raises trust score alarm, and blocks the final step"
          ]
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Success.
    *   `401 Unauthorized` - Invalid token.

#### `POST /api/simulation/run`
*   **Purpose:** Executes a mock security attack scenario in the NovaCorp sandbox environment synchronously and returns the complete execution logs and final verdict.
*   **Authentication Requirement:** Required (JWT Bearer Token)
*   **Request Body (JSON):**
    ```json
    {
      "scenarioId": "compound_attack"
    }
    ```
*   **Response Body (JSON):**
    ```json
    {
      "simulationId": "sim_89231",
      "scenarioId": "compound_attack",
      "status": "COMPLETED",
      "startedAt": "2026-08-27T21:20:00Z",
      "completedAt": "2026-08-27T21:20:02Z",
      "executionSummary": {
        "totalEventsIngested": 5,
        "finalVerdict": "BLOCK",
        "finalTrustScore": 20,
        "primaryTriggerReason": "Attack-Chain Intelligence: Multi-step critical sequence correlated"
      },
      "events": [
        {
          "eventId": "evt_sim_01",
          "sessionId": "sess_sim_99",
          "agentId": "agent_001",
          "parentAgentId": null,
          "timestamp": "2026-08-27T21:20:00.100Z",
          "action": "view_file",
          "tool": "file_system",
          "resource": "untrusted_input.txt",
          "dataSensitivity": "LOW",
          "authorization": {
            "status": "ALLOWED",
            "requiredPermission": "file.read",
            "grantedPermissions": ["file.read", "db.read"]
          },
          "provenance": {
            "sourceType": "EXTERNAL_DOCUMENT",
            "sourceId": "untrusted_input.txt",
            "trustLevel": "UNTRUSTED"
          }
        },
        {
          "eventId": "evt_sim_02",
          "sessionId": "sess_sim_99",
          "agentId": "agent_001",
          "parentAgentId": null,
          "timestamp": "2026-08-27T21:20:00.400Z",
          "action": "evaluate_prompt",
          "tool": "llm",
          "resource": "system_prompt",
          "dataSensitivity": "LOW",
          "authorization": {
            "status": "ALLOWED",
            "requiredPermission": "llm.evaluate",
            "grantedPermissions": ["file.read", "db.read", "llm.evaluate"]
          },
          "provenance": {
            "sourceType": "EXTERNAL_DOCUMENT",
            "sourceId": "untrusted_input.txt",
            "trustLevel": "UNTRUSTED"
          }
        },
        {
          "eventId": "evt_sim_03",
          "sessionId": "sess_sim_99",
          "agentId": "agent_001",
          "parentAgentId": null,
          "timestamp": "2026-08-27T21:20:00.800Z",
          "action": "query_db",
          "tool": "database_connector",
          "resource": "NovaCorp_Credentials",
          "dataSensitivity": "HIGH",
          "authorization": {
            "status": "ALLOWED",
            "requiredPermission": "db.read",
            "grantedPermissions": ["file.read", "db.read", "llm.evaluate"]
          },
          "provenance": {
            "sourceType": "EXTERNAL_DOCUMENT",
            "sourceId": "untrusted_input.txt",
            "trustLevel": "UNTRUSTED"
          }
        },
        {
          "eventId": "evt_sim_04",
          "sessionId": "sess_sim_99",
          "agentId": "agent_001",
          "parentAgentId": null,
          "timestamp": "2026-08-27T21:20:01.200Z",
          "action": "delegate_task",
          "tool": "agent_manager",
          "resource": "sub_agent_02",
          "dataSensitivity": "HIGH",
          "authorization": {
            "status": "ALLOWED",
            "requiredPermission": "agent.delegate",
            "grantedPermissions": ["file.read", "db.read", "llm.evaluate", "agent.delegate"]
          },
          "provenance": {
            "sourceType": "ANOTHER_AGENT",
            "sourceId": "agent_001",
            "trustLevel": "UNTRUSTED"
          }
        },
        {
          "eventId": "evt_sim_05",
          "sessionId": "sess_sim_99",
          "agentId": "agent_001",
          "parentAgentId": "sub_agent_02",
          "timestamp": "2026-08-27T21:20:01.600Z",
          "action": "http_post",
          "tool": "http_client",
          "resource": "https://malicious-external-domain.com/exfiltrate",
          "dataSensitivity": "CRITICAL",
          "authorization": {
            "status": "DENIED",
            "requiredPermission": "network.send",
            "grantedPermissions": ["file.read", "db.read", "llm.evaluate", "agent.delegate"]
          },
          "provenance": {
            "sourceType": "ANOTHER_AGENT",
            "sourceId": "agent_001",
            "trustLevel": "UNTRUSTED"
          }
        }
      ],
      "results": [
        {
          "eventId": "evt_sim_01",
          "decision": "ALLOW",
          "riskLevel": "LOW",
          "trustScore": 90,
          "intent": {
            "status": "ALIGNED",
            "alignmentScore": 0.95
          },
          "attackChain": {
            "detected": false,
            "severity": "NONE",
            "chainId": null
          },
          "securitySignals": {
            "policyViolation": false,
            "intentDrift": false,
            "provenanceRisk": "LOW",
            "dataSensitivity": "LOW",
            "attackChainRisk": "NONE"
          },
          "reasons": ["Regular document read action authorized."]
        },
        {
          "eventId": "evt_sim_02",
          "decision": "ALLOW",
          "riskLevel": "LOW",
          "trustScore": 80,
          "intent": {
            "status": "DRIFT",
            "alignmentScore": 0.65
          },
          "attackChain": {
            "detected": false,
            "severity": "NONE",
            "chainId": null
          },
          "securitySignals": {
            "policyViolation": false,
            "intentDrift": true,
            "provenanceRisk": "HIGH",
            "dataSensitivity": "LOW",
            "attackChainRisk": "NONE"
          },
          "reasons": [
            "Intent drift identified: instructions in untrusted document influencing LLM prompt execution."
          ]
        },
        {
          "eventId": "evt_sim_03",
          "decision": "REVIEW",
          "riskLevel": "HIGH",
          "trustScore": 55,
          "intent": {
            "status": "DRIFT",
            "alignmentScore": 0.35
          },
          "attackChain": {
            "detected": false,
            "severity": "NONE",
            "chainId": null
          },
          "securitySignals": {
            "policyViolation": false,
            "intentDrift": true,
            "provenanceRisk": "HIGH",
            "dataSensitivity": "HIGH",
            "attackChainRisk": "LOW"
          },
          "reasons": [
            "Attempting to query credentials table while under untrusted instruction context."
          ]
        },
        {
          "eventId": "evt_sim_04",
          "decision": "REVIEW",
          "riskLevel": "HIGH",
          "trustScore": 45,
          "intent": {
            "status": "DRIFT",
            "alignmentScore": 0.25
          },
          "attackChain": {
            "detected": false,
            "severity": "NONE",
            "chainId": null
          },
          "securitySignals": {
            "policyViolation": false,
            "intentDrift": true,
            "provenanceRisk": "HIGH",
            "dataSensitivity": "HIGH",
            "attackChainRisk": "MEDIUM"
          },
          "reasons": [
            "Agent attempting to delegate commands to sub-agent to bypass main agent constraints."
          ]
        },
        {
          "eventId": "evt_sim_05",
          "decision": "BLOCK",
          "riskLevel": "CRITICAL",
          "trustScore": 20,
          "intent": {
            "status": "DRIFT",
            "alignmentScore": 0.05
          },
          "attackChain": {
            "detected": true,
            "severity": "CRITICAL",
            "chainId": "chain_abc_sim_01"
          },
          "securitySignals": {
            "policyViolation": true,
            "intentDrift": true,
            "provenanceRisk": "CRITICAL",
            "dataSensitivity": "CRITICAL",
            "attackChainRisk": "CRITICAL"
          },
          "reasons": [
            "Policy violation: agent session lacks network.send permission",
            "Stateful attack chain correlated: indirect_injection -> prompt_influence -> database_read -> agent_delegation -> network_exfiltration"
          ]
        }
      ]
    }
    ```
*   **HTTP Status Codes:**
    *   `200 OK` - Simulation ran and finished successfully, returning full security results synchronously.
    *   `400 Bad Request` - Unknown or invalid scenarioId.
    *   `401 Unauthorized` - Invalid token.
*   **Error Example (400):**
    ```json
    {
      "error": {
        "code": "INVALID_SCENARIO",
        "message": "Scenario ID 'invalid_id' does not exist."
      }
    }
    ```
