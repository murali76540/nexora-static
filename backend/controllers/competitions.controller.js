/**
 * NEXORA Competitions Controller
 * E.G.S. Pillay Engineering College
 */

const { FirebaseService } = require('../services/firebase.service');
const { logSecurityEvent } = require('../services/audit.service');

const CompetitionsController = {
  // Get all competitions (Public)
  getAllCompetitions: async (req, res) => {
    try {
      const competitions = await FirebaseService.getCompetitions();
      return res.json({ success: true, competitions });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve competitions.' });
    }
  },

  // Get single competition with its problem versions
  getCompetitionById: async (req, res) => {
    try {
      const { id } = req.params;
      const competition = await FirebaseService.getCompetitionById(id);
      if (!competition) {
        return res.status(404).json({ success: false, error: 'Competition not found.' });
      }

      const isPrivileged = req.user && (req.user.role === 'organizer' || req.user.role === 'admin');
      const versions = await FirebaseService.getProblemVersions(id, isPrivileged);
      let userEnrollment = null;

      if (req.user) {
        userEnrollment = await FirebaseService.getUserEnrollment(id, req.user.id);
      }

      const now = Date.now();
      const startTime = competition.startTime ? new Date(competition.startTime).getTime() : 0;
      const hasStarted = now >= startTime;

      return res.json({
        success: true,
        competition,
        versions,
        userEnrollment,
        hasStarted,
        isPrivileged
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Error fetching competition details.' });
    }
  },

  // Create new competition (Organizer/Admin)
  createCompetition: async (req, res) => {
    try {
      const { title, department, category, description, participantLimit, startTime, initialDeadline } = req.body;

      if (!title || !department || !description) {
        return res.status(400).json({ success: false, error: 'Title, department, and description are required.' });
      }

      const competition = await FirebaseService.createCompetition({
        title,
        department,
        category,
        description,
        participantLimit: participantLimit || 100,
        startTime: startTime || new Date().toISOString(),
        initialDeadline
      });

      logSecurityEvent({
        action: 'COMPETITION_CREATED',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { competitionId: competition.id, title: competition.title }
      });

      return res.status(201).json({ success: true, competition });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to create competition.' });
    }
  },

  // Join a competition (Member with 100 max limit & duplicate check)
  joinCompetition: async (req, res) => {
    try {
      const { id } = req.params;
      const { pathway } = req.body;
      const userId = req.user.id;
      const userEmail = req.user.email;

      const chosenPathway = pathway === 'WITHOUT_AI' ? 'WITHOUT_AI' : 'AI_ASSISTED';

      const enrollment = await FirebaseService.joinCompetition(id, userId, userEmail, chosenPathway);

      logSecurityEvent({
        action: 'COMPETITION_JOINED',
        performedBy: userEmail,
        role: 'participant',
        ip: req.ip,
        details: { competitionId: id, pathway: chosenPathway }
      });

      return res.status(201).json({
        success: true,
        message: 'Successfully enrolled in competition.',
        enrollment
      });
    } catch (err) {
      if (err.code === 'ALREADY_REGISTERED') {
        return res.status(409).json({ success: false, error: err.message });
      }
      if (err.code === 'SLOT_FULL') {
        return res.status(400).json({ success: false, error: err.message });
      }
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: 'Registration failed.' });
    }
  },

  // Get joined competitions for current user
  getMyJoinedCompetitions: async (req, res) => {
    try {
      const joined = await FirebaseService.getUserJoinedCompetitions(req.user.id);
      return res.json({ success: true, joined });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch enrolled competitions.' });
    }
  },

  // Get problem statements for member's joined competitions
  getMyProblems: async (req, res) => {
    try {
      const problems = await FirebaseService.getMemberProblems(req.user.id);
      return res.json({ success: true, problems });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch problem statements.' });
    }
  },

  // Update competition details (Organizer/Admin)
  updateCompetition: async (req, res) => {
    try {
      const { id } = req.params;
      const updated = await FirebaseService.updateCompetition(id, req.body);
      return res.json({ success: true, competition: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update competition.' });
    }
  },

  // Update Problem Statement V1.0 (Organizer/Admin - Allows admin to update/publish specification based on start time)
  updateProblemStatement: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, realWorldBackground, problemStatement, technicalRequirements, constraints, startTime, initialDeadline } = req.body;

      if (!title || !problemStatement) {
        return res.status(400).json({ success: false, error: 'Title and problem statement are required.' });
      }

      const result = await FirebaseService.updateProblemStatement(id, {
        title,
        realWorldBackground,
        problemStatement,
        technicalRequirements,
        constraints,
        startTime,
        initialDeadline
      });

      logSecurityEvent({
        action: 'PROBLEM_STATEMENT_UPDATED',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { competitionId: id, version: '1.0', startTime: result.competition.startTime }
      });

      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message || 'Failed to update problem statement.' });
    }
  },

  // Publish Version 1.0 (Organizer/Admin - Immutable)
  publishVersion1: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, realWorldBackground, problemStatement, technicalRequirements, constraints } = req.body;

      if (!title || !problemStatement) {
        return res.status(400).json({ success: false, error: 'Title and problem statement are required.' });
      }

      const version = await FirebaseService.publishVersion1(id, {
        title,
        realWorldBackground,
        problemStatement,
        technicalRequirements,
        constraints
      });

      logSecurityEvent({
        action: 'PROBLEM_V1_PUBLISHED',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { competitionId: id, version: '1.0' }
      });

      return res.status(201).json({ success: true, version });
    } catch (err) {
      if (err.code === 'VERSION_1_IMMUTABLE') {
        return res.status(409).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: 'Failed to publish Version 1.0.' });
    }
  },

  // Publish Version 2.0 (Organizer/Admin - Unexpected Problem Shift)
  publishVersion2: async (req, res) => {
    try {
      const { id } = req.params;
      const { title, disruptionType, impactLevel, updatedStatement, newRequirements, explanationOfChanges, deadlineExtensionHours } = req.body;

      if (!updatedStatement || !disruptionType) {
        return res.status(400).json({ success: false, error: 'Disruption type and updated problem statement are required.' });
      }

      const version = await FirebaseService.publishVersion2(id, {
        title,
        disruptionType,
        impactLevel: impactLevel || 'CRITICAL',
        updatedStatement,
        newRequirements,
        explanationOfChanges,
        deadlineExtensionHours: parseInt(deadlineExtensionHours, 10) || 0
      });

      logSecurityEvent({
        action: 'PROBLEM_V2_PUBLISHED',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { competitionId: id, version: '2.0', impactLevel: version.impactLevel }
      });

      return res.status(201).json({ success: true, version });
    } catch (err) {
      if (err.code === 'NO_V1_EXISTS') {
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: 'Failed to publish Version 2.0 disruption.' });
    }
  },

  // Get Competition Roster (Organizer/Admin)
  getCompetitionRoster: async (req, res) => {
    try {
      const { id } = req.params;
      const members = await FirebaseService.getCompetitionMembers(id);
      return res.json({ success: true, members });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to get roster.' });
    }
  }
};

module.exports = CompetitionsController;
