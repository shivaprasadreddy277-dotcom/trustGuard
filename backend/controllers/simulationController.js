/**
 * TrustGuard — Simulation Controller (Cycle 5)
 *
 * Implements endpoints for interactive security simulation scenarios:
 *   GET  /api/simulation/scenarios — List available simulation scenarios
 *   POST /api/simulation/run       — Execute a real simulation scenario
 *   GET  /api/simulation/runs/:id  — Retrieve simulation execution report
 *   GET  /api/simulation/runs      — List previous simulation runs
 */
'use strict';

const simulationService = require('../services/simulationService');
const { sendError } = require('../middleware/errorHandler');

/**
 * GET /api/simulation/scenarios
 * Returns the list of interactive security scenarios.
 */
async function getScenarios(req, res) {
  const scenarios = simulationService.getScenarios();
  return res.status(200).json({ scenarios });
}

/**
 * POST /api/simulation/run
 * POST /api/simulations
 * Executes a simulation scenario through the authoritative security pipeline.
 */
async function runSimulation(req, res, next) {
  try {
    const scenarioId = req.body.scenarioId || req.body.scenario || req.body.scenario_name;

    if (!scenarioId || typeof scenarioId !== 'string' || scenarioId.trim() === '') {
      return sendError(res, 400, 'VALIDATION_ERROR', "Field 'scenarioId' is required.");
    }

    const userId = req.user.userId;
    const result = await simulationService.runSimulation({
      scenarioId: scenarioId.trim(),
      userId,
    });

    return res.status(201).json(result);
  } catch (err) {
    if (err.code === 'UNKNOWN_SCENARIO') {
      return sendError(res, 400, err.code, err.message);
    }
    if (err.code === 'AGENT_NOT_FOUND') {
      return sendError(res, 500, err.code, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/simulation/runs/:simulationId
 * GET /api/simulations/:simulationId
 * Retrieves detailed forensic report for a simulation run.
 */
async function getSimulationById(req, res, next) {
  try {
    const { simulationId } = req.params;
    const userId = req.user.userId;

    const simData = await simulationService.getSimulationById(simulationId, userId);
    return res.status(200).json(simData);
  } catch (err) {
    if (err.code === 'SIMULATION_NOT_FOUND') {
      return sendError(res, 404, err.code, err.message);
    }
    if (err.code === 'FORBIDDEN') {
      return sendError(res, 403, err.code, err.message);
    }
    next(err);
  }
}

/**
 * GET /api/simulation/runs
 * GET /api/simulations
 * Lists simulation runs for the authenticated operator.
 */
async function listSimulations(req, res, next) {
  try {
    const userId = req.user.userId;
    const limit = parseInt(req.query.limit, 10) || 20;

    const runs = await simulationService.listSimulationRuns(userId, limit);
    return res.status(200).json({ simulations: runs, runs });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getScenarios,
  runSimulation,
  getSimulationById,
  listSimulations,
};
