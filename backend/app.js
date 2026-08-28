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
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
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
