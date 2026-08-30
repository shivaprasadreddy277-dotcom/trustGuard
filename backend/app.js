/**
 * TrustGuard Backend — Express Application
 * Wires middleware, routes, and error handling.
 */
'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const authRouter = require('./routes/auth');
const healthRouter = require('./routes/health');
const agentsRouter = require('./routes/agents');
const sessionsRouter = require('./routes/sessions');
const eventsRouter = require('./routes/events');
const securityRouter = require('./routes/security');
const simulationRouter = require('./routes/simulation');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

// ── Security Headers ────────────────────────────────────────────────────────
app.use(helmet());

// ── CORS ─────────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
]
  .filter(Boolean)
  .flatMap((o) => o.split(',').map((s) => s.trim().replace(/\/+$/, '')))
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server, health probes)
    if (!origin) return callback(null, true);

    const normalizedOrigin = origin.trim().replace(/\/+$/, '');
    if (allowedOrigins.includes(normalizedOrigin)) {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

// ── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/agent/events', eventsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/security', securityRouter);
app.use('/api/simulation', simulationRouter);
app.use('/api/simulations', simulationRouter);

// ── 404 & Error Handlers ─────────────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
