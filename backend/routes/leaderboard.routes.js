/**
 * NEXORA Leaderboard Routes
 */
const express = require('express');
const router = express.Router();
const LeaderboardController = require('../controllers/leaderboard.controller');
const { authenticate, requireOrganizer, requireAdmin } = require('../middleware/auth.middleware');

// Public/participant leaderboard retrieval (shows hidden placeholder if unreleased)
router.get('/:competitionId', authenticate, LeaderboardController.getLeaderboard);

// Organizer toggle
router.post('/:competitionId/toggle', authenticate, requireOrganizer, LeaderboardController.toggleVisibility);

// Admin master override
router.post('/:competitionId/admin-override', authenticate, requireAdmin, LeaderboardController.adminMasterOverride);

module.exports = router;
