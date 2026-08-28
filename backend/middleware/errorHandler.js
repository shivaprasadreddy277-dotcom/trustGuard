/**
 * TrustGuard — Standard Error Response Helpers
 */
'use strict';

/**
 * Send a standard contract-compliant error response.
 * @param {import('express').Response} res
 * @param {number} status - HTTP status code
 * @param {string} code   - Machine-readable error code
 * @param {string} message - Human-readable explanation
 */
function sendError(res, status, code, message) {
  return res.status(status).json({ error: { code, message } });
}

/**
 * Global 404 handler — must be registered after all routes.
 */
function notFoundHandler(req, res) {
  return sendError(res, 404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found.`);
}

/**
 * Global error handler — must be the last middleware registered.
 * Never surfaces internal details or stack traces to the client.
 */
function errorHandler(err, req, res, _next) { // eslint-disable-line no-unused-vars
  console.error('[ErrorHandler]', err.message);
  return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected internal error occurred.');
}

module.exports = { sendError, notFoundHandler, errorHandler };
