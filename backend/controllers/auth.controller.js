/**
 * NEXORA Authentication Controller
 * E.G.S. Pillay Engineering College
 */

const { FirebaseService } = require('../services/firebase.service');
const { hashValue, verifyHash } = require('../utils/crypto');
const { logSecurityEvent } = require('../services/audit.service');
const { 
  createSession, 
  destroySession, 
  validateOrganizerKey, 
  validateAdminKey 
} = require('../middleware/auth.middleware');

const AuthController = {
  // 1. Member-Only Registration
  registerMember: async (req, res) => {
    try {
      const { name, email, department, academicYear, password, confirmPassword } = req.body;

      if (!name || !email || !department || !academicYear || !password) {
        return res.status(400).json({ success: false, error: 'All fields are required.' });
      }

      // Email restriction: Only @egspec.edu email addresses accepted
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail.endsWith('@egspec.edu')) {
        logSecurityEvent({
          action: 'REGISTRATION_REJECTED',
          performedBy: cleanEmail,
          role: 'anonymous',
          ip: req.ip,
          details: { reason: 'Non-institutional email attempted' }
        });
        return res.status(400).json({ 
          success: false, 
          error: 'Registration restricted: Only @egspec.edu institutional email addresses are permitted.' 
        });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: 'Passwords do not match.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
      }

      // Strict participant role assignment - public registration cannot choose roles
      const passwordHash = await hashValue(password);
      const user = await FirebaseService.createUser({
        name: name.trim(),
        email: cleanEmail,
        department: department.trim(),
        academicYear: academicYear.trim(),
        passwordHash,
        role: 'participant' // Strictly participant
      });

      // Automatically establish session
      const session = createSession(user.id, 'participant', {
        name: user.name,
        email: user.email,
        department: user.department,
        academicYear: user.academicYear
      });

      logSecurityEvent({
        action: 'MEMBER_REGISTERED',
        performedBy: user.email,
        role: 'participant',
        ip: req.ip,
        details: { userId: user.id, department: user.department }
      });

      return res.status(201).json({
        success: true,
        message: 'Member account created successfully.',
        sessionToken: session.token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: 'participant',
          department: user.department,
          academicYear: user.academicYear
        },
        redirectUrl: '/dashboard.html?tab=member'
      });
    } catch (err) {
      if (err.code === 'DUPLICATE_EMAIL') {
        return res.status(409).json({ success: false, error: err.message });
      }
      return res.status(500).json({ success: false, error: 'Server error during registration.' });
    }
  },

  // 2. Method 1: Member Login (College email + password)
  memberLogin: async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ success: false, error: 'College email and password are required.' });
      }

      const cleanEmail = email.trim().toLowerCase();
      const user = await FirebaseService.getUserByEmail(cleanEmail);

      if (!user) {
        logSecurityEvent({
          action: 'LOGIN_FAILURE',
          performedBy: cleanEmail,
          role: 'participant',
          ip: req.ip,
          details: { reason: 'User not found' }
        });
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ success: false, error: 'Account is suspended. Contact college administrator.' });
      }

      const isValid = await verifyHash(password, user.passwordHash);
      if (!isValid) {
        logSecurityEvent({
          action: 'LOGIN_FAILURE',
          performedBy: cleanEmail,
          role: 'participant',
          ip: req.ip,
          details: { reason: 'Incorrect password' }
        });
        return res.status(401).json({ success: false, error: 'Invalid email or password.' });
      }

      const session = createSession(user.id, user.role || 'participant', {
        name: user.name,
        email: user.email,
        department: user.department,
        academicYear: user.academicYear
      });

      logSecurityEvent({
        action: 'LOGIN_SUCCESS',
        performedBy: user.email,
        role: user.role || 'participant',
        ip: req.ip,
        details: { method: 'MEMBER_LOGIN' }
      });

      return res.json({
        success: true,
        message: 'Member authentication successful.',
        sessionToken: session.token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role || 'participant',
          department: user.department,
          academicYear: user.academicYear
        },
        redirectUrl: '/dashboard.html?tab=member'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Authentication service error.' });
    }
  },

  // 3. Method 2: Organiser Access (Organizer ID/email + Organizer Access Key)
  organizerAccess: async (req, res) => {
    try {
      const { organizerId, accessKey } = req.body;
      if (!organizerId || !accessKey) {
        return res.status(400).json({ success: false, error: 'Organizer ID and Access Key are required.' });
      }

      const cleanKey = accessKey.trim();
      const cleanId = organizerId.trim();

      const isValid = validateOrganizerKey(cleanKey);
      if (!isValid) {
        logSecurityEvent({
          action: 'ORGANIZER_ACCESS_DENIED',
          performedBy: cleanId,
          role: 'organizer_attempt',
          ip: req.ip,
          details: { reason: 'Invalid or cross-role access key attempted' }
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid Organizer Access Key. Access denied.' 
        });
      }

      const session = createSession(`ORG-${cleanId}`, 'organizer', {
        name: `Organizer (${cleanId})`,
        email: cleanId.includes('@') ? cleanId : `${cleanId}@egspec.edu`,
        organizerId: cleanId
      });

      logSecurityEvent({
        action: 'ORGANIZER_ACCESS_SUCCESS',
        performedBy: cleanId,
        role: 'organizer',
        ip: req.ip,
        details: { method: 'ORGANIZER_ACCESS' }
      });

      return res.json({
        success: true,
        message: 'Organizer authentication verified.',
        sessionToken: session.token,
        user: {
          id: `ORG-${cleanId}`,
          name: `Organizer (${cleanId})`,
          email: cleanId.includes('@') ? cleanId : `${cleanId}@egspec.edu`,
          role: 'organizer'
        },
        redirectUrl: '/dashboard.html?tab=organizer'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Organizer authentication error.' });
    }
  },

  // 4. Method 3: Admin Access (Admin ID/email + Admin Access Key)
  adminAccess: async (req, res) => {
    try {
      const { adminId, accessKey } = req.body;
      if (!adminId || !accessKey) {
        return res.status(400).json({ success: false, error: 'Administrator ID and Access Key are required.' });
      }

      const cleanKey = accessKey.trim();
      const cleanId = adminId.trim();

      const isValid = validateAdminKey(cleanKey);
      if (!isValid) {
        logSecurityEvent({
          action: 'ADMIN_ACCESS_DENIED',
          performedBy: cleanId,
          role: 'admin_attempt',
          ip: req.ip,
          details: { reason: 'Invalid or cross-role access key attempted' }
        });
        return res.status(401).json({ 
          success: false, 
          error: 'Invalid Administrator Access Key. Access denied.' 
        });
      }

      const session = createSession(`ADM-${cleanId}`, 'admin', {
        name: `Administrator (${cleanId})`,
        email: cleanId.includes('@') ? cleanId : `${cleanId}@egspec.edu`,
        adminId: cleanId
      });

      logSecurityEvent({
        action: 'ADMIN_ACCESS_SUCCESS',
        performedBy: cleanId,
        role: 'admin',
        ip: req.ip,
        details: { method: 'ADMIN_ACCESS' }
      });

      return res.json({
        success: true,
        message: 'Administrator authentication verified.',
        sessionToken: session.token,
        user: {
          id: `ADM-${cleanId}`,
          name: `Administrator (${cleanId})`,
          email: cleanId.includes('@') ? cleanId : `${cleanId}@egspec.edu`,
          role: 'admin'
        },
        redirectUrl: '/dashboard.html?tab=admin'
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: 'Admin authentication error.' });
    }
  },

  // 5. Logout & Re-locking Protected Dashboards
  logout: async (req, res) => {
    const token = req.sessionToken || req.headers['x-session-token'];
    if (token) {
      destroySession(token);
    }
    if (req.user) {
      logSecurityEvent({
        action: 'LOGOUT',
        performedBy: req.user.email || req.user.id,
        role: req.user.role,
        ip: req.ip,
        details: { message: 'Session invalidated, dashboard re-locked.' }
      });
    }
    return res.json({ success: true, message: 'Logged out successfully. Protected dashboards re-locked.' });
  },

  // 6. Current Session Check
  getCurrentUser: async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ success: false, authenticated: false });
    }
    return res.json({
      success: true,
      authenticated: true,
      user: req.user
    });
  }
};

module.exports = AuthController;
