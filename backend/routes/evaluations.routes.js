/**
 * NEXORA Evaluations Routes
 */
const express = require('express');
const router = express.Router();
const EvaluationsController = require('../controllers/evaluations.controller');
const { authenticate, requireOrganizer } = require('../middleware/auth.middleware');

// Authorized judges / Organizers submit evaluations
router.post('/submit', authenticate, requireOrganizer, EvaluationsController.submitEvaluation);
router.get('/competition/:competitionId', authenticate, EvaluationsController.getEvaluations);

module.exports = router;
