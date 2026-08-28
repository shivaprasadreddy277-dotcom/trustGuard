/**
 * TrustGuard — Simulation Routes (Cycle 5)
 */
'use strict';

const express = require('express');
const { authenticate } = require('../middleware/authenticate');
const simulationController = require('../controllers/simulationController');

const router = express.Router();

// All simulation endpoints require valid JWT authentication
router.use(authenticate);

// Scenarios catalogue
router.get('/scenarios', simulationController.getScenarios);

// Execute simulation
router.post('/run', simulationController.runSimulation);
router.post('/', simulationController.runSimulation);

// Query simulation runs
router.get('/runs/:simulationId', simulationController.getSimulationById);
router.get('/runs', simulationController.listSimulations);
router.get('/:simulationId', simulationController.getSimulationById);
router.get('/', simulationController.listSimulations);

module.exports = router;
