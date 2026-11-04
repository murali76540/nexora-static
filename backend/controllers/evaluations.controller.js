/**
 * NEXORA Evaluations & Judge Scoring Controller
 * E.G.S. Pillay Engineering College
 */

const { FirebaseService } = require('../services/firebase.service');
const { logSecurityEvent } = require('../services/audit.service');

const EvaluationsController = {
  // Submit evaluation using 7-criteria weighted rubric (Organizer / Authorized Judge)
  submitEvaluation: async (req, res) => {
    try {
      const { 
        competitionId, 
        userId, 
        pathway, 
        scores, 
        publicFeedback, 
        privateJudgeNotes 
      } = req.body;

      if (!competitionId || !userId || !scores) {
        return res.status(400).json({ success: false, error: 'Competition ID, User ID and rubric scores are required.' });
      }

      const judgeId = req.user.id;
      const judgeName = req.user.name || req.user.email;

      const evaluation = await FirebaseService.submitEvaluation({
        competitionId,
        userId,
        judgeId,
        judgeName,
        pathway: pathway || 'AI_ASSISTED',
        scores,
        publicFeedback,
        privateJudgeNotes
      });

      logSecurityEvent({
        action: 'EVALUATION_SUBMITTED',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { 
          competitionId, 
          userId, 
          totalScore: evaluation.totalWeightedScore,
          adaptabilityScore: evaluation.adaptabilityScore
        }
      });

      return res.status(201).json({
        success: true,
        message: 'Evaluation submitted successfully.',
        evaluation
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to record evaluation.' });
    }
  },

  // Get evaluations for a competition (Role-filtered)
  getEvaluations: async (req, res) => {
    try {
      const { competitionId } = req.params;
      const isPrivileged = req.user && (req.user.role === 'organizer' || req.user.role === 'admin');

      const evaluations = await FirebaseService.getCompetitionEvaluations(competitionId, isPrivileged);
      return res.json({ success: true, evaluations });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to fetch evaluations.' });
    }
  }
};

module.exports = EvaluationsController;
