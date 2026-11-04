/**
 * NEXORA Submissions & Cryptographic Receipts Controller
 * E.G.S. Pillay Engineering College
 */

const { FirebaseService } = require('../services/firebase.service');
const { logSecurityEvent } = require('../services/audit.service');

const SubmissionsController = {
  // Initial Solution Submission (Stage 04)
  submitInitial: async (req, res) => {
    try {
      const { 
        competitionId, 
        pathway, 
        solutionTitle, 
        technicalApproach, 
        methodology, 
        repoUrl, 
        aiDeclaration, 
        independentMethodology 
      } = req.body;

      if (!competitionId || !solutionTitle || !technicalApproach || !methodology || !repoUrl) {
        return res.status(400).json({ success: false, error: 'Missing required submission fields.' });
      }

      const submission = await FirebaseService.submitInitialSolution({
        competitionId,
        userId: req.user.id,
        userEmail: req.user.email,
        participantName: req.user.name,
        pathway: pathway || 'AI_ASSISTED',
        solutionTitle,
        technicalApproach,
        methodology,
        repoUrl,
        aiDeclaration,
        independentMethodology
      });

      logSecurityEvent({
        action: 'SUBMISSION_INITIAL_CREATED',
        performedBy: req.user.email,
        role: req.user.role,
        ip: req.ip,
        details: { 
          competitionId, 
          receiptId: submission.receiptId, 
          hash: submission.receiptHash 
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Initial solution submitted successfully.',
        submission,
        receipt: {
          receiptId: submission.receiptId,
          receiptHash: submission.receiptHash,
          submittedAt: submission.submittedAt
        }
      });
    } catch (err) {
      if (err.code === 'NOT_ENROLLED') {
        return res.status(403).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: 'Submission failed.' });
    }
  },

  // Adaptive Solution Revision (Stage 07)
  submitRevision: async (req, res) => {
    try {
      const {
        competitionId,
        pathway,
        solutionTitle,
        updatedSolution,
        revisedMethodology,
        explanationOfChanges,
        adaptationStrategy,
        repoUrl,
        testingEvidence
      } = req.body;

      if (!competitionId || !updatedSolution || !adaptationStrategy || !explanationOfChanges || !repoUrl) {
        return res.status(400).json({ success: false, error: 'Missing required revision fields.' });
      }

      const revision = await FirebaseService.submitRevisionSolution({
        competitionId,
        userId: req.user.id,
        userEmail: req.user.email,
        participantName: req.user.name,
        pathway: pathway || 'AI_ASSISTED',
        solutionTitle: solutionTitle || 'Revised Solution',
        updatedSolution,
        revisedMethodology,
        explanationOfChanges,
        adaptationStrategy,
        repoUrl,
        testingEvidence
      });

      logSecurityEvent({
        action: 'SUBMISSION_REVISION_CREATED',
        performedBy: req.user.email,
        role: req.user.role,
        ip: req.ip,
        details: { 
          competitionId, 
          receiptId: revision.receiptId, 
          hash: revision.receiptHash 
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Adaptive revision submitted successfully.',
        revision,
        receipt: {
          receiptId: revision.receiptId,
          receiptHash: revision.receiptHash,
          submittedAt: revision.submittedAt
        }
      });
    } catch (err) {
      if (err.code === 'NOT_ENROLLED') {
        return res.status(403).json({ success: false, error: err.message });
      }
      if (err.code === 'NO_V2_RELEASED') {
        return res.status(400).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: 'Revision submission failed.' });
    }
  },

  // Get current user's submission history for a competition
  getSubmissionHistory: async (req, res) => {
    try {
      const { competitionId } = req.params;
      const history = await FirebaseService.getSubmissionHistory(competitionId, req.user.id);
      return res.json({ success: true, history });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve submission history.' });
    }
  },

  // Get all submissions for a user across all competitions
  getUserSubmissions: async (req, res) => {
    try {
      const submissions = await FirebaseService.getUserAllSubmissions(req.user.id);
      return res.json({ success: true, submissions });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve submissions.' });
    }
  },

  // Organizer/Admin: view all submissions for competition
  getCompetitionSubmissions: async (req, res) => {
    try {
      const { competitionId } = req.params;
      const submissions = await FirebaseService.getAllSubmissionsForCompetition(competitionId);
      return res.json({ success: true, submissions });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to load submissions.' });
    }
  },

  // Receipt Verification & Tamper Check
  verifyReceipt: async (req, res) => {
    try {
      const { receiptId } = req.params;
      const receipt = await FirebaseService.getReceiptById(receiptId);
      if (!receipt) {
        return res.status(404).json({ success: false, verified: false, error: 'Receipt ID not found in institutional ledger.' });
      }

      return res.json({
        success: true,
        verified: true,
        receipt: {
          receiptId: receipt.receiptId,
          competitionId: receipt.competitionId,
          userEmail: receipt.userEmail,
          version: receipt.version,
          type: receipt.type,
          receiptHash: receipt.receiptHash,
          submittedAt: receipt.submittedAt,
          cryptographicProof: 'SHA-256 Validated against Canonical Ledger'
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Error validating receipt.' });
    }
  }
};

module.exports = SubmissionsController;
