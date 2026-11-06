import type { Request, Response, NextFunction } from 'express';
import { adminService } from '../services/admin.service.js';
import { userRepository } from '../repositories/user.repository.js';
import { adminReportRepository } from '../repositories/adminReport.repository.js';
import { adminAuditRepository } from '../repositories/adminAudit.repository.js';
import { skillRepository } from '../repositories/skill.repository.js';
import { platformSettingRepository } from '../repositories/platformSetting.repository.js';
import { emailJobRepository } from '../repositories/emailJob.repository.js';
import { runReminderWorkerOnce } from '../jobs/reminder.worker.js';
import { userSkillRepository } from '../repositories/userSkill.repository.js';
import { billingService } from '../services/billing/billing.service.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';


export class AdminController {
  async getOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await adminService.getOverview();
      res.status(200).json({ success: true, data: stats });
    } catch (err) {
      next(err);
    }
  }

  async getTrends(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const days = parseInt(req.query['days'] as string, 10) || 14;
      const trends = await adminService.getTrends(days);
      res.status(200).json({ success: true, data: trends });
    } catch (err) {
      next(err);
    }
  }

  async getTopSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = parseInt(req.query['limit'] as string, 10) || 5;
      const topSkills = await adminService.getTopSkills(limit);
      res.status(200).json({ success: true, data: topSkills });
    } catch (err) {
      next(err);
    }
  }

  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 20;
      const search = (req.query['search'] as string) || undefined;
      const status = (req.query['status'] as string) || undefined;
      const role = (req.query['role'] as string) || undefined;

      const result = await userRepository.findAllPaginated({ page, limit, search, status, role });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getUserDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = parseInt(req.params['id'] as string, 10);
      if (isNaN(userId)) throw new BadRequestError('Invalid user ID');

      const user = await userRepository.findById(userId);
      if (!user) throw new NotFoundError('User not found');

      const [teachingSkills, learningSkills] = await Promise.all([
        userSkillRepository.findTeachingSkillsByUser(userId),
        userSkillRepository.findLearningSkillsByUser(userId),
      ]);

      res.status(200).json({
        success: true,
        data: {
          user: userRepository.toSafeUser(user),
          teachingSkills,
          learningSkills,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async suspendUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const targetUserId = parseInt(req.params['id'] as string, 10);
      const { reason } = req.body;

      if (!reason || typeof reason !== 'string' || reason.trim().length < 3) {
        throw new BadRequestError('A valid suspension reason (at least 3 characters) is required');
      }

      const updatedUser = await adminService.suspendUser(adminId, targetUserId, reason.trim(), {
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      });

      res.status(200).json({
        success: true,
        message: 'User account suspended successfully',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  async reactivateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const targetUserId = parseInt(req.params['id'] as string, 10);

      const updatedUser = await adminService.reactivateUser(adminId, targetUserId, {
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      });

      res.status(200).json({
        success: true,
        message: 'User account reactivated successfully',
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  async changeUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const targetUserId = parseInt(req.params['id'] as string, 10);
      const { role } = req.body;

      if (!role || typeof role !== 'string') {
        throw new BadRequestError('Role is required');
      }

      const updatedUser = await adminService.changeUserRole(adminId, targetUserId, role.toUpperCase(), {
        ipAddress: req.ip || undefined,
        userAgent: req.get('user-agent') || undefined,
      });

      res.status(200).json({
        success: true,
        message: `User role updated to ${role.toUpperCase()}`,
        data: updatedUser,
      });
    } catch (err) {
      next(err);
    }
  }

  async getReports(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 20;
      const status = (req.query['status'] as string) || undefined;
      const category = (req.query['category'] as string) || undefined;

      const result = await adminReportRepository.findAllPaginated({ page, limit, status, category });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async resolveReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const reportId = parseInt(req.params['id'] as string, 10);
      const { resolutionNotes, actionTaken } = req.body;

      if (!resolutionNotes || typeof resolutionNotes !== 'string') {
        throw new BadRequestError('Resolution notes are required');
      }

      const result = await adminService.resolveReport(
        adminId,
        reportId,
        { resolutionNotes: resolutionNotes.trim(), actionTaken },
        { ipAddress: req.ip || undefined, userAgent: req.get('user-agent') || undefined }
      );

      res.status(200).json({
        success: true,
        message: 'Report resolved successfully',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async dismissReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const reportId = parseInt(req.params['id'] as string, 10);
      const { resolutionNotes } = req.body;

      const result = await adminService.dismissReport(
        adminId,
        reportId,
        resolutionNotes?.trim() || 'Dismissed by moderator',
        { ipAddress: req.ip || undefined, userAgent: req.get('user-agent') || undefined }
      );

      res.status(200).json({
        success: true,
        message: 'Report dismissed',
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getSkills(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const search = (req.query['search'] as string) || undefined;
      const category = (req.query['category'] as string) || undefined;
      const status = (req.query['status'] as string) || undefined;

      const skills = await skillRepository.findCatalogWithStats({ search, category, status });
      res.status(200).json({ success: true, data: skills });
    } catch (err) {
      next(err);
    }
  }

  async createSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { name, category, description } = req.body;

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        throw new BadRequestError('Skill name is required');
      }
      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        throw new BadRequestError('Skill category is required');
      }

      const skill = await adminService.createSkill(
        adminId,
        { name: name.trim(), category: category.trim(), description: description?.trim() },
        { ipAddress: req.ip || undefined, userAgent: req.get('user-agent') || undefined }
      );

      res.status(201).json({ success: true, data: skill });
    } catch (err) {
      next(err);
    }
  }

  async updateSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const skillId = parseInt(req.params['id'] as string, 10);
      const { name, category, description, isDisabled } = req.body;

      const skill = await adminService.updateSkill(
        adminId,
        skillId,
        { name, category, description, isDisabled },
        { ipAddress: req.ip || undefined, userAgent: req.get('user-agent') || undefined }
      );

      res.status(200).json({ success: true, data: skill });
    } catch (err) {
      next(err);
    }
  }

  async getSettings(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const settings = await platformSettingRepository.getAll();
      res.status(200).json({ success: true, data: settings });
    } catch (err) {
      next(err);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user!.id;
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        throw new BadRequestError('Settings object is required');
      }

      const updated = await adminService.updateSettings(
        adminId,
        settings,
        { ipAddress: req.ip || undefined, userAgent: req.get('user-agent') || undefined }
      );

      res.status(200).json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }

  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 25;
      const action = (req.query['action'] as string) || undefined;
      const targetType = (req.query['targetType'] as string) || undefined;

      const result = await adminAuditRepository.findAllPaginated({ page, limit, action, targetType });
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getEmailJobs(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [stats, recentJobs] = await Promise.all([
        emailJobRepository.getDeliveryStats(),
        emailJobRepository.findRecent(25),
      ]);
      res.status(200).json({ success: true, data: { stats, recentJobs } });
    } catch (err) {
      next(err);
    }
  }

  async triggerReminders(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await runReminderWorkerOnce();
      res.status(200).json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  async getBillingOverview(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await billingService.getAdminOverview();
      res.status(200).json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async getBillingSubscriptions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 20;
      const status = (req.query['status'] as string) || undefined;
      const planCode = (req.query['planCode'] as string) || undefined;

      const result = await billingService.getAdminSubscriptions(page, limit, status, planCode);
      res.status(200).json({
        success: true,
        data: result.subscriptions,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async getBillingTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = parseInt(req.query['page'] as string, 10) || 1;
      const limit = parseInt(req.query['limit'] as string, 10) || 20;

      const result = await billingService.getAdminTransactions(page, limit);
      res.status(200).json({
        success: true,
        data: result.transactions,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: result.totalPages,
        },
      });
    } catch (err) {
      next(err);
    }
  }
}


export const adminController = new AdminController();
