/**
 * TrustGuard — Authentication Controller
 *
 * Handles user registration, login, and /me.
 * All logic follows docs/API_CONTRACT.md exactly.
 *
 * Security rules enforced:
 *  - password_hash is NEVER returned in any response
 *  - JWT secret is loaded from env; never hard-coded
 *  - Login failures use generic messaging (no user enumeration)
 *  - Public user ID (user_id_str) is used in responses, not internal UUID
 */
'use strict';

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const pool = require('../db/pool');
const { sendError } = require('../middleware/errorHandler');

const BCRYPT_WORK_FACTOR = 12;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Generate a public user ID string in the format usr_<8-char-hex>.
 * Uses UUID entropy but produces a short, contract-compatible string.
 */
function generateUserIdStr() {
  return 'usr_' + uuidv4().replace(/-/g, '').slice(0, 16);
}

/** Minimal email format check */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email));
}

/**
 * Sign a JWT for the given user record.
 * Payload carries only the minimal set of non-sensitive claims.
 */
function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured.');
  }
  return jwt.sign(
    {
      userId: user.id,           // internal UUID (for DB lookups)
      userIdStr: user.user_id_str, // public ID
      username: user.username,
      email: user.email,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * Contract: { username, name, email, password } → { user, token }
 */
async function register(req, res, next) {
  try {
    const { username, name, email, password } = req.body;

    // ── Input Validation ────────────────────────────────────────────────────
    const missing = ['username', 'name', 'email', 'password'].filter(
      (f) => !req.body[f] || String(req.body[f]).trim() === ''
    );
    if (missing.length > 0) {
      return sendError(res, 400, 'VALIDATION_ERROR',
        `Missing required fields: ${missing.join(', ')}.`);
    }

    if (!isValidEmail(email)) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'The email address format is invalid.');
    }

    if (String(username).trim().length < 3) {
      return sendError(res, 400, 'VALIDATION_ERROR',
        'Username must be at least 3 characters long.');
    }

    if (String(password).length < 8) {
      return sendError(res, 400, 'VALIDATION_ERROR',
        'Password must be at least 8 characters long.');
    }

    // ── Duplicate Check ─────────────────────────────────────────────────────
    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email.toLowerCase().trim(), username.trim()]
    );

    if (existing.rows.length > 0) {
      // Check which constraint is hit — keep email-specific message per contract
      const byEmail = await pool.query(
        'SELECT id FROM users WHERE email = $1',
        [email.toLowerCase().trim()]
      );
      if (byEmail.rows.length > 0) {
        return sendError(res, 400, 'EMAIL_ALREADY_EXISTS',
          'A user with this email address already exists.');
      }
      return sendError(res, 400, 'USERNAME_ALREADY_EXISTS',
        'A user with this username already exists.');
    }

    // ── Hash Password ───────────────────────────────────────────────────────
    const passwordHash = await bcrypt.hash(password, BCRYPT_WORK_FACTOR);

    // ── Create User ─────────────────────────────────────────────────────────
    const userIdStr = generateUserIdStr();

    const result = await pool.query(
      `INSERT INTO users (user_id_str, username, name, email, password_hash)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id_str, username, email, created_at`,
      [userIdStr, username.trim(), name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const newUser = result.rows[0];
    const token = signToken(newUser);

    // ── Response (password_hash NEVER included) ─────────────────────────────
    return res.status(201).json({
      user: {
        id: newUser.user_id_str,     // public ID per API contract
        username: newUser.username,
        email: newUser.email,
        createdAt: newUser.created_at,
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * POST /api/auth/login
 * Contract: { email, password } → { user, token }
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    // ── Input Validation ────────────────────────────────────────────────────
    if (!email || !password) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Email and password are required.');
    }

    // ── Lookup User ─────────────────────────────────────────────────────────
    // Fetch password_hash for comparison, but it is NEVER returned to the client
    const result = await pool.query(
      `SELECT id, user_id_str, username, email, password_hash
       FROM users WHERE email = $1 OR username = $1`,
      [email.toLowerCase().trim()]
    );

    // ── Generic Failure — no user enumeration ───────────────────────────────
    if (result.rows.length === 0) {
      // Perform a dummy comparison to keep constant-time behaviour
      await bcrypt.compare(password, '$2b$12$invalidhashpaddingtomatchrounds0000000000000000000000000');
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const user = result.rows[0];
    const passwordValid = await bcrypt.compare(password, user.password_hash);

    if (!passwordValid) {
      return sendError(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    }

    const token = signToken(user);

    // ── Response (password_hash NEVER included) ─────────────────────────────
    return res.status(200).json({
      user: {
        id: user.user_id_str,
        username: user.username,
        email: user.email,
      },
      token,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * GET /api/auth/me
 * Contract: Bearer token required → { user }
 * Identity is sourced from the verified JWT, NOT from request body/params.
 */
async function me(req, res, next) {
  try {
    // req.user is populated by the authenticate middleware from the verified JWT
    const result = await pool.query(
      `SELECT id, user_id_str, username, email, created_at
       FROM users WHERE id = $1`,
      [req.user.userId]
    );

    if (result.rows.length === 0) {
      return sendError(res, 401, 'UNAUTHORIZED', 'Authorization token is missing or has expired.');
    }

    const user = result.rows[0];

    // password_hash is never selected, so it cannot leak
    return res.status(200).json({
      user: {
        id: user.user_id_str,
        username: user.username,
        email: user.email,
        createdAt: user.created_at,
      },
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = { register, login, me };
