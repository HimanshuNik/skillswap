import type { Request, Response, NextFunction } from 'express';
import { adminReportRepository } from '../repositories/adminReport.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { BadRequestError, NotFoundError } from '../utils/errors.js';

export class ReportController {
  async createReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reporterId = req.user!.id;
      const { reportedId, targetType, targetId, category, reason } = req.body;

      if (!reportedId || isNaN(Number(reportedId))) {
        throw new BadRequestError('Valid reportedId is required');
      }

      const numReportedId = Number(reportedId);
      if (reporterId === numReportedId) {
        throw new BadRequestError('You cannot report your own profile');
      }

      const targetUser = await userRepository.findById(numReportedId);
      if (!targetUser) {
        throw new NotFoundError('Reported user does not exist');
      }

      const validCategories = ['HARASSMENT', 'SPAM', 'INAPPROPRIATE', 'NO_SHOW', 'FRAUD', 'OTHER'];
      if (!category || !validCategories.includes(category)) {
        throw new BadRequestError(`Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }

      if (!reason || typeof reason !== 'string' || reason.trim().length < 5) {
        throw new BadRequestError('Please provide a reason with at least 5 characters');
      }

      // Check for recent duplicate report from this user against the same target
      const recent = await adminReportRepository.findRecentByUser(reporterId, numReportedId, 24);
      if (recent && recent.status === 'OPEN') {
        throw new BadRequestError('You have already submitted an open report for this user in the last 24 hours');
      }

      const report = await adminReportRepository.createReport({
        reporterId,
        reportedId: numReportedId,
        targetType: targetType || 'USER',
        targetId: targetId ? Number(targetId) : null,
        category,
        reason: reason.trim(),
      });

      res.status(201).json({
        success: true,
        message: 'Report submitted successfully. Our moderation team will review it.',
        data: report,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const reportController = new ReportController();

