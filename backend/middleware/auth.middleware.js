/**
 * NEXORA Role-Based Access Control & Auth Middleware
 * E.G.S. Pillay Engineering College
 */

const { logSecurityEvent } = require('../services/audit.service');
const { db } = require('../database/database');

const DEV_ORGANIZER_KEY = process.env.ORGANIZER_ACCESS_KEY || 'NEXORA-ORGANIZER-2026';
const DEV_ADMIN_KEY = process.env.ADMIN_ACCESS_KEY || 'NEXORA-ADMIN-2026';

// Persistent session store: token -> sessionData
const activeSessions = db.sessions;

function createSession(userId, role, metadata = {}) {
  const token = `NX-${role.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours
  const session = {
    token,
    userId,
    role,
    metadata,
    createdAt: Date.now(),
    expiresAt
  };
  activeSessions.set(token, session);
  return session;
}

function getSession(token) {
  if (!token) return null;
  const session = activeSessions.get(token);
  if (!session) return null;
  if (Date.now() > session.expiresAt) {
    activeSessions.delete(token);
    return null;
  }
  return session;
}

function destroySession(token) {
  if (token) {
    activeSessions.delete(token);
  }
}

/**
 * Authentication extraction middleware
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  let token = null;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  }

  if (token) {
    const session = getSession(token);
    if (session) {
      req.user = {
        id: session.userId,
        role: session.role,
        ...session.metadata
      };
      req.sessionToken = token;
      return next();
    }
  }

  // Check fallback dev headers if present
  const clientRole = req.headers['x-user-role'];
  const clientUserId = req.headers['x-user-id'];
  if (clientRole && clientUserId) {
    req.user = {
      id: clientUserId,
      role: clientRole,
      email: req.headers['x-user-email'] || `${clientUserId}@egspec.edu`
    };
    return next();
  }

  req.user = null;
  next();
}

/**
 * Require authenticated member
 */
function requireMember(req, res, next) {
  if (!req.user) {
    logSecurityEvent({
      action: 'ACCESS_DENIED',
      performedBy: 'anonymous',
      role: 'none',
      ip: req.ip,
      details: { path: req.originalUrl, reason: 'Unauthenticated member request' }
    });
    return res.status(401).json({ success: false, error: 'Authentication required. Please log in.' });
  }
  next();
}

/**
 * Require Organizer permission (Organizers or Admins)
 */
function requireOrganizer(req, res, next) {
  if (!req.user || (req.user.role !== 'organizer' && req.user.role !== 'admin')) {
    logSecurityEvent({
      action: 'ACCESS_DENIED',
      performedBy: req.user ? req.user.id : 'anonymous',
      role: req.user ? req.user.role : 'none',
      ip: req.ip,
      details: { path: req.originalUrl, requiredRole: 'organizer' }
    });
    return res.status(403).json({ success: false, error: 'Access denied: Organizer authorization required.' });
  }
  next();
}

/**
 * Require Administrator permission
 */
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    logSecurityEvent({
      action: 'ACCESS_DENIED',
      performedBy: req.user ? req.user.id : 'anonymous',
      role: req.user ? req.user.role : 'none',
      ip: req.ip,
      details: { path: req.originalUrl, requiredRole: 'admin' }
    });
    return res.status(403).json({ success: false, error: 'Access denied: Administrator authorization required.' });
  }
  next();
}

/**
 * Validate Organizer Key strictly
 * Rejects Admin key!
 */
function validateOrganizerKey(key) {
  if (!key) return false;
  // CROSS-KEY REJECTION: If user tried admin key, strictly reject
  if (key === DEV_ADMIN_KEY) {
    return false;
  }
  return key === DEV_ORGANIZER_KEY;
}

/**
 * Validate Admin Key strictly
 * Rejects Organizer key!
 */
function validateAdminKey(key) {
  if (!key) return false;
  // CROSS-KEY REJECTION: If user tried organizer key, strictly reject
  if (key === DEV_ORGANIZER_KEY) {
    return false;
  }
  return key === DEV_ADMIN_KEY;
}

module.exports = {
  DEV_ORGANIZER_KEY,
  DEV_ADMIN_KEY,
  createSession,
  getSession,
  destroySession,
  authenticate,
  requireMember,
  requireOrganizer,
  requireAdmin,
  validateOrganizerKey,
  validateAdminKey
};
