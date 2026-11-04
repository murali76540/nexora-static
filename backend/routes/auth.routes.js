/**
 * NEXORA Auth Routes
 */
const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/rateLimiter.middleware');

const loginLimiter = createRateLimiter({ windowMs: 60000, max: 20, message: 'Too many login attempts. Please wait 1 minute.' });

// 1. Member registration (Member-only @egspec.edu)
router.post('/register', AuthController.registerMember);

// 2. Three access methods
router.post('/login', loginLimiter, AuthController.memberLogin);
router.post('/organizer-access', loginLimiter, AuthController.organizerAccess);
router.post('/admin-access', loginLimiter, AuthController.adminAccess);

// 3. Logout & Session check
router.post('/logout', authenticate, AuthController.logout);
router.get('/session', authenticate, AuthController.getCurrentUser);

module.exports = router;
