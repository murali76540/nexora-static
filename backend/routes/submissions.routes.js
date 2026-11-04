/**
 * NEXORA Submissions Routes
 */
const express = require('express');
const router = express.Router();
const SubmissionsController = require('../controllers/submissions.controller');
const { authenticate, requireMember, requireOrganizer } = require('../middleware/auth.middleware');
const { createRateLimiter } = require('../middleware/rateLimiter.middleware');

const submitLimiter = createRateLimiter({ windowMs: 60000, max: 15, message: 'Submission rate limit reached. Please wait.' });

// Member submissions
router.post('/initial', authenticate, requireMember, submitLimiter, SubmissionsController.submitInitial);
router.post('/revision', authenticate, requireMember, submitLimiter, SubmissionsController.submitRevision);
router.get('/my-history/:competitionId', authenticate, requireMember, SubmissionsController.getSubmissionHistory);
router.get('/my-submissions', authenticate, requireMember, SubmissionsController.getUserSubmissions);

// Privileged organizer view
router.get('/competition/:competitionId', authenticate, requireOrganizer, SubmissionsController.getCompetitionSubmissions);

// Cryptographic Receipt verification
router.get('/receipt/:receiptId', SubmissionsController.verifyReceipt);

module.exports = router;
