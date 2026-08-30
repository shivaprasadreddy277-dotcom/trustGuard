/**
 * TrustGuard — Auth Routes
 * POST /api/auth/register
 * POST /api/auth/login
 * GET  /api/auth/me  (protected)
 */
'use strict';

const { Router } = require('express');
const { register, login, googleAuth, me } = require('../controllers/authController');
const { authenticate } = require('../middleware/authenticate');

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/google', googleAuth);
router.get('/me', authenticate, me);

module.exports = router;
