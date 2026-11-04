/**
 * NEXORA Leaderboard & Results Controller
 * E.G.S. Pillay Engineering College
 */

const { FirebaseService } = require('../services/firebase.service');
const { logSecurityEvent } = require('../services/audit.service');

const LeaderboardController = {
  // Get Leaderboard (Strict Role-Based Visibility)
  getLeaderboard: async (req, res) => {
    try {
      const { competitionId } = req.params;
      const isPrivileged = req.user && (req.user.role === 'organizer' || req.user.role === 'admin');

      const leaderboardData = await FirebaseService.getLeaderboard(competitionId, isPrivileged);
      return res.json({ success: true, ...leaderboardData });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve leaderboard data.' });
    }
  },

  // Toggle Leaderboard Visibility (Organizer / Admin)
  toggleVisibility: async (req, res) => {
    try {
      const { competitionId } = req.params;
      const { isPublished } = req.body;

      const settings = await FirebaseService.setLeaderboardVisibility(competitionId, isPublished);

      logSecurityEvent({
        action: 'LEADERBOARD_VISIBILITY_TOGGLED',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { competitionId, isPublished: settings.isPublished }
      });

      return res.json({
        success: true,
        message: `Leaderboard is now ${settings.isPublished ? 'PUBLIC' : 'HIDDEN FROM MEMBERS'}.`,
        settings
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update leaderboard visibility.' });
    }
  },

  // Master Leaderboard Override (Admin only)
  adminMasterOverride: async (req, res) => {
    try {
      const { competitionId } = req.params;
      const { isPublished } = req.body;

      const settings = await FirebaseService.setLeaderboardVisibility(competitionId, isPublished);

      logSecurityEvent({
        action: 'ADMIN_LEADERBOARD_OVERRIDE',
        performedBy: req.user.email || req.user.id,
        role: 'admin',
        ip: req.ip,
        details: { competitionId, isPublished: settings.isPublished, override: true }
      });

      return res.json({
        success: true,
        message: `Admin override applied: Leaderboard is now ${settings.isPublished ? 'PUBLISHED' : 'HIDDEN'}.`,
        settings
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to execute admin override.' });
    }
  }
};

module.exports = LeaderboardController;
