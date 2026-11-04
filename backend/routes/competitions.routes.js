/**
 * NEXORA Competitions Routes
 */
const express = require('express');
const router = express.Router();
const CompetitionsController = require('../controllers/competitions.controller');
const { authenticate, requireMember, requireOrganizer } = require('../middleware/auth.middleware');

// Public catalog & member queries
router.get('/', authenticate, CompetitionsController.getAllCompetitions);
router.get('/my-joined', authenticate, requireMember, CompetitionsController.getMyJoinedCompetitions);
router.get('/my-problems', authenticate, requireMember, CompetitionsController.getMyProblems);
router.get('/:id', authenticate, CompetitionsController.getCompetitionById);
router.post('/:id/join', authenticate, requireMember, CompetitionsController.joinCompetition);

// Organizer / Admin actions
router.post('/', authenticate, requireOrganizer, CompetitionsController.createCompetition);
router.put('/:id', authenticate, requireOrganizer, CompetitionsController.updateCompetition);
router.post('/:id/publish-v1', authenticate, requireOrganizer, CompetitionsController.publishVersion1);
router.post('/:id/update-problem', authenticate, requireOrganizer, CompetitionsController.updateProblemStatement);
router.post('/:id/publish-v2', authenticate, requireOrganizer, CompetitionsController.publishVersion2);
router.get('/:id/roster', authenticate, requireOrganizer, CompetitionsController.getCompetitionRoster);

module.exports = router;
