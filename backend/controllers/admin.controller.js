/**
 * NEXORA Admin Controller
 * E.G.S. Pillay Engineering College
 */

const { FirebaseService, db } = require('../services/firebase.service');
const { getAuditLogs, logSecurityEvent } = require('../services/audit.service');
const os = require('os');

const AdminController = {
  // System Metrics & Overview
  getSystemMetrics: async (req, res) => {
    try {
      const users = await FirebaseService.getAllUsers();
      const competitions = await FirebaseService.getCompetitions();
      const totalSubmissions = db.submissions.size;
      const totalReceipts = db.submissionReceipts.size;
      const { dbManager } = require('../database/database');
      const dbStatus = dbManager.getStatus();

      const activeComps = competitions.filter(c => c.status === 'ACTIVE').length;

      return res.json({
        success: true,
        metrics: {
          totalUsers: users.length,
          totalCompetitions: competitions.length,
          activeCompetitions: activeComps,
          totalSubmissions,
          totalReceipts,
          databaseStatus: 'CONNECTED',
          databaseEngine: dbStatus.engine,
          databaseRecords: dbStatus.totalRecords,
          diskSizeKB: dbStatus.diskSizeKB,
          storageDirectory: dbStatus.storageDirectory,
          activeSessionsCount: db.sessions ? db.sessions.size : 1,
          serverHealth: 'HEALTHY',
          uptimeSeconds: Math.floor(process.uptime()),
          nodeVersion: process.version,
          systemMemory: {
            freeMB: Math.round(os.freemem() / 1024 / 1024),
            totalMB: Math.round(os.totalmem() / 1024 / 1024)
          }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve system metrics.' });
    }
  },

  // User Management: List all users
  getAllUsers: async (req, res) => {
    try {
      const users = await FirebaseService.getAllUsers();
      return res.json({ success: true, users });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to retrieve users.' });
    }
  },

  // User Management: Promote or Demote role
  updateUserRole: async (req, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      if (!['participant', 'organizer', 'admin'].includes(role)) {
        return res.status(400).json({ success: false, error: 'Invalid role specified.' });
      }

      const updatedUser = await FirebaseService.updateUserRole(userId, role);

      logSecurityEvent({
        action: 'ROLE_MODIFIED',
        performedBy: req.user.email || req.user.id,
        role: 'admin',
        ip: req.ip,
        details: { targetUserId: userId, newRole: role }
      });

      return res.json({
        success: true,
        message: `User role updated to ${role}.`,
        user: updatedUser
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update user role.' });
    }
  },

  // User Management: Suspend / Activate Account
  updateUserStatus: async (req, res) => {
    try {
      const { userId } = req.params;
      const { status } = req.body;

      if (!['active', 'suspended'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Status must be active or suspended.' });
      }

      const updatedUser = await FirebaseService.updateUserStatus(userId, status);

      logSecurityEvent({
        action: 'USER_STATUS_UPDATED',
        performedBy: req.user.email || req.user.id,
        role: 'admin',
        ip: req.ip,
        details: { targetUserId: userId, newStatus: status }
      });

      return res.json({
        success: true,
        message: `User status changed to ${status}.`,
        user: updatedUser
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to update user status.' });
    }
  },

  // Security Audit Log (Append-only ledger retrieval)
  getAuditLogs: async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 100;
      const logs = getAuditLogs(limit);
      return res.json({ success: true, count: logs.length, logs });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Failed to load audit logs.' });
    }
  },

  // Create Database Backup (Admin only)
  createDatabaseBackup: async (req, res) => {
    try {
      const { dbManager } = require('../database/database');
      const backupResult = dbManager.createBackup();

      logSecurityEvent({
        action: 'DATABASE_BACKUP_CREATED',
        performedBy: req.user.email || req.user.id,
        role: 'admin',
        ip: req.ip,
        details: { backupDir: backupResult.backupDir, filesCount: backupResult.filesCount }
      });

      return res.json({
        success: true,
        message: 'Database backup snapshot created successfully.',
        backup: backupResult
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Backup creation failed: ' + err.message });
    }
  }
};

module.exports = AdminController;
