import { Router } from 'express';
import { adminController } from '../controllers/admin.controller.js';
import { authenticate, requireAdmin, requireModerator } from '../middleware/auth.middleware.js';

const router = Router();

// All admin routes require valid authentication
router.use(authenticate);

// Moderation & Analytics (Accessible to MODERATOR and ADMIN)
router.get('/overview', requireModerator, (req, res, next) => adminController.getOverview(req, res, next));
router.get('/trends', requireModerator, (req, res, next) => adminController.getTrends(req, res, next));
router.get('/skills/top', requireModerator, (req, res, next) => adminController.getTopSkills(req, res, next));
router.get('/reports', requireModerator, (req, res, next) => adminController.getReports(req, res, next));
router.post('/reports/:id/resolve', requireModerator, (req, res, next) => adminController.resolveReport(req, res, next));
router.post('/reports/:id/dismiss', requireModerator, (req, res, next) => adminController.dismissReport(req, res, next));
router.get('/users', requireModerator, (req, res, next) => adminController.getUsers(req, res, next));
router.get('/users/:id', requireModerator, (req, res, next) => adminController.getUserDetails(req, res, next));
router.get('/skills', requireModerator, (req, res, next) => adminController.getSkills(req, res, next));
router.get('/audit', requireModerator, (req, res, next) => adminController.getAuditLogs(req, res, next));
router.get('/settings', requireModerator, (req, res, next) => adminController.getSettings(req, res, next));
router.get('/emails', requireModerator, (req, res, next) => adminController.getEmailJobs(req, res, next));
router.get('/billing/overview', requireModerator, (req, res, next) => adminController.getBillingOverview(req, res, next));
router.get('/billing/subscriptions', requireModerator, (req, res, next) => adminController.getBillingSubscriptions(req, res, next));
router.get('/billing/transactions', requireModerator, (req, res, next) => adminController.getBillingTransactions(req, res, next));


// Strict Admin Operations (ADMIN only)
router.post('/users/:id/suspend', requireAdmin, (req, res, next) => adminController.suspendUser(req, res, next));
router.post('/users/:id/reactivate', requireAdmin, (req, res, next) => adminController.reactivateUser(req, res, next));
router.patch('/users/:id/role', requireAdmin, (req, res, next) => adminController.changeUserRole(req, res, next));
router.post('/skills', requireAdmin, (req, res, next) => adminController.createSkill(req, res, next));
router.patch('/skills/:id', requireAdmin, (req, res, next) => adminController.updateSkill(req, res, next));
router.put('/settings', requireAdmin, (req, res, next) => adminController.updateSettings(req, res, next));
router.post('/reminders/run', requireAdmin, (req, res, next) => adminController.triggerReminders(req, res, next));

export default router;

