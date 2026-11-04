/**
 * NEXORA Admin Routes
 */
const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/admin.controller');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// All admin routes require Administrator authorization
router.use(authenticate, requireAdmin);

router.get('/metrics', AdminController.getSystemMetrics);
router.post('/database/backup', AdminController.createDatabaseBackup);
router.get('/users', AdminController.getAllUsers);
router.put('/users/:userId/role', AdminController.updateUserRole);
router.put('/users/:userId/status', AdminController.updateUserStatus);
router.get('/audit-logs', AdminController.getAuditLogs);

module.exports = router;
