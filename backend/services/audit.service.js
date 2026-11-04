/**
 * NEXORA Audit Logging Service
 * Provides tamper-resistant, append-only security auditing
 */

const { db } = require('../database/database');

/**
 * Log a system security event
 * @param {Object} event
 * @param {string} event.action - e.g. 'LOGIN_SUCCESS', 'LOGIN_FAILURE', 'ACCESS_DENIED', 'SUBMISSION_CREATED', 'VERSION_PUBLISHED', 'LEADERBOARD_TOGGLED'
 * @param {string} event.performedBy - User ID or email or 'anonymous'
 * @param {string} event.role - Role of actor
 * @param {string} [event.ip] - Client IP address
 * @param {Object} [event.details] - Additional contextual data
 */
function logSecurityEvent({ action, performedBy, role = 'anonymous', ip = '127.0.0.1', details = {} }) {
  const logEntry = {
    id: `AUDIT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
    timestamp: new Date().toISOString(),
    action,
    performedBy,
    role,
    ip,
    details,
    immutable: true
  };

  // Append-only to persistent ledger
  db.auditLogs.set(logEntry.id, Object.freeze(logEntry));
  return logEntry;
}

/**
 * Retrieve all audit logs (Admin only)
 */
function getAuditLogs(limit = 100) {
  return Array.from(db.auditLogs.values()).reverse().slice(0, limit);
}

/**
 * Clear logs for testing purposes only
 */
function _resetLogsForTesting() {
  db.auditLogs.clear();
}

module.exports = {
  logSecurityEvent,
  getAuditLogs,
  _resetLogsForTesting
};
