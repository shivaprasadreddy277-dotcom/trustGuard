/**
 * TrustGuard — JWT Authentication Middleware
 *
 * Validates Bearer tokens on protected routes.
 * Attaches the verified user payload to req.user.
 * Never trusts user-supplied IDs in request body/params for identity.
 */
'use strict';

const jwt = require('jsonwebtoken');
const { sendError } = require('./errorHandler');

function authenticate(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return sendError(res, 401, 'UNAUTHORIZED', 'Authorization token is missing or has expired.');
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  if (!process.env.JWT_SECRET) {
    console.error('[Auth] JWT_SECRET is not configured.');
    return sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected internal error occurred.');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // { userId, userIdStr, username, email, iat, exp }
    return next();
  } catch (err) {
    // jwt.verify throws JsonWebTokenError, TokenExpiredError, NotBeforeError
    return sendError(res, 401, 'UNAUTHORIZED', 'Authorization token is missing or has expired.');
  }
}

module.exports = { authenticate };
