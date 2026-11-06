import type { Request, Response } from 'express';
import { groupSessionService } from '../services/collaboration/groupSession.service.js';
import { groupAttendanceService } from '../services/collaboration/groupAttendance.service.js';
import { groupResourceService } from '../services/collaboration/groupResource.service.js';
import { groupTaskService } from '../services/collaboration/groupTask.service.js';
import { groupMilestoneService } from '../services/collaboration/groupMilestone.service.js';
import { groupChatService } from '../services/collaboration/groupChat.service.js';
import { groupAnnouncementService } from '../services/collaboration/groupAnnouncement.service.js';
import { groupAnalyticsService } from '../services/collaboration/groupAnalytics.service.js';
import {
  createGroupSessionSchema,
  updateGroupSessionSchema,
  updateAttendanceSchema,
  createGroupResourceSchema,
  createGroupTaskSchema,
  updateGroupTaskSchema,
  createGroupMilestoneSchema,
  updateGroupMilestoneSchema,
  createGroupAnnouncementSchema,
  createGroupMessageSchema,
} from '../validators/collaboration.validator.js';
import { BadRequestError } from '../utils/errors.js';

export class CollaborationController {
  // --- Sessions ---
  async createSession(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const validated = createGroupSessionSchema.parse(req.body);
    const session = await groupSessionService.scheduleSession(groupId, req.user!.id, validated);
    res.status(201).json({ success: true, data: session });
  }

  async listSessions(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const status = req.query.status as string | undefined;
    const sessions = await groupSessionService.listGroupSessions(groupId, req.user?.id, { status });
    res.json({ success: true, data: sessions });
  }

  async getSession(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!groupId || !sessionId) throw new BadRequestError('Invalid group or session ID');

    const session = await groupSessionService.getSessionById(groupId, sessionId, req.user?.id);
    res.json({ success: true, data: session });
  }

  async updateSession(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!groupId || !sessionId) throw new BadRequestError('Invalid group or session ID');

    const validated = updateGroupSessionSchema.parse(req.body);
    const updated = await groupSessionService.updateSession(
      groupId,
      sessionId,
      req.user!.id,
      validated
    );
    res.json({ success: true, data: updated });
  }

  async cancelSession(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!groupId || !sessionId) throw new BadRequestError('Invalid group or session ID');

    const reason = req.body?.reason as string | undefined;
    const cancelled = await groupSessionService.cancelSession(
      groupId,
      sessionId,
      req.user!.id,
      reason
    );
    res.json({ success: true, data: cancelled });
  }

  // --- Registration & Attendance ---
  async registerSession(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!groupId || !sessionId) throw new BadRequestError('Invalid group or session ID');

    const result = await groupAttendanceService.register(groupId, sessionId, req.user!.id);
    res.status(201).json({ success: true, data: result });
  }

  async unregisterSession(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!groupId || !sessionId) throw new BadRequestError('Invalid group or session ID');

    const result = await groupAttendanceService.unregister(groupId, sessionId, req.user!.id);
    res.json({ success: true, data: result });
  }

  async listParticipants(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    if (!groupId || !sessionId) throw new BadRequestError('Invalid group or session ID');

    const participants = await groupAttendanceService.listParticipants(
      groupId,
      sessionId,
      req.user?.id
    );
    res.json({ success: true, data: participants });
  }

  async updateAttendance(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const sessionId = Number(req.params.sessionId);
    const participantUserId = Number(req.params.participantUserId);
    if (!groupId || !sessionId || !participantUserId) {
      throw new BadRequestError('Invalid group, session, or participant ID');
    }

    const validated = updateAttendanceSchema.parse(req.body);
    const updated = await groupAttendanceService.updateAttendance(
      groupId,
      sessionId,
      participantUserId,
      req.user!.id,
      validated
    );
    res.json({ success: true, data: updated });
  }

  // --- Resources ---
  async createResource(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const validated = createGroupResourceSchema.parse(req.body);
    const resource = await groupResourceService.createResource(groupId, req.user!.id, validated);
    res.status(201).json({ success: true, data: resource });
  }

  async listResources(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const resourceType = req.query.resourceType as string | undefined;
    const search = req.query.search as string | undefined;

    const resources = await groupResourceService.listResources(groupId, req.user?.id, {
      resourceType,
      search,
    });
    res.json({ success: true, data: resources });
  }

  async downloadResource(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const resourceId = Number(req.params.resourceId);
    if (!groupId || !resourceId) throw new BadRequestError('Invalid group or resource ID');

    const downloadInfo = await groupResourceService.getResourceDownload(
      groupId,
      resourceId,
      req.user!.id
    );

    res.download(downloadInfo.absolutePath, downloadInfo.fileName, (err) => {
      if (err && !res.headersSent) {
        res.status(500).json({ success: false, message: 'File transfer error' });
      }
    });
  }

  async deleteResource(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const resourceId = Number(req.params.resourceId);
    if (!groupId || !resourceId) throw new BadRequestError('Invalid group or resource ID');

    await groupResourceService.deleteResource(groupId, resourceId, req.user!.id);
    res.json({ success: true, message: 'Resource deleted successfully' });
  }

  // --- Tasks ---
  async createTask(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const validated = createGroupTaskSchema.parse(req.body);
    const task = await groupTaskService.createTask(groupId, req.user!.id, validated);
    res.status(201).json({ success: true, data: task });
  }

  async listTasks(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const status = req.query.status as string | undefined;
    const assigneeId = req.query.assigneeId ? Number(req.query.assigneeId) : undefined;

    const tasks = await groupTaskService.listTasks(groupId, req.user?.id, { status, assigneeId });
    res.json({ success: true, data: tasks });
  }

  async updateTask(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const taskId = Number(req.params.taskId);
    if (!groupId || !taskId) throw new BadRequestError('Invalid group or task ID');

    const validated = updateGroupTaskSchema.parse(req.body);
    const updated = await groupTaskService.updateTask(groupId, taskId, req.user!.id, validated);
    res.json({ success: true, data: updated });
  }

  async deleteTask(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const taskId = Number(req.params.taskId);
    if (!groupId || !taskId) throw new BadRequestError('Invalid group or task ID');

    await groupTaskService.deleteTask(groupId, taskId, req.user!.id);
    res.json({ success: true, message: 'Task deleted successfully' });
  }

  // --- Milestones ---
  async createMilestone(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const validated = createGroupMilestoneSchema.parse(req.body);
    const milestone = await groupMilestoneService.createMilestone(
      groupId,
      req.user!.id,
      validated
    );
    res.status(201).json({ success: true, data: milestone });
  }

  async listMilestones(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const milestones = await groupMilestoneService.listMilestones(groupId, req.user?.id);
    res.json({ success: true, data: milestones });
  }

  async updateMilestone(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const milestoneId = Number(req.params.milestoneId);
    if (!groupId || !milestoneId) throw new BadRequestError('Invalid group or milestone ID');

    const validated = updateGroupMilestoneSchema.parse(req.body);
    const updated = await groupMilestoneService.updateMilestone(
      groupId,
      milestoneId,
      req.user!.id,
      validated
    );
    res.json({ success: true, data: updated });
  }

  async deleteMilestone(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const milestoneId = Number(req.params.milestoneId);
    if (!groupId || !milestoneId) throw new BadRequestError('Invalid group or milestone ID');

    await groupMilestoneService.deleteMilestone(groupId, milestoneId, req.user!.id);
    res.json({ success: true, message: 'Milestone deleted successfully' });
  }

  // --- Chat ---
  async sendMessage(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const validated = createGroupMessageSchema.parse(req.body);
    const message = await groupChatService.sendMessage(groupId, req.user!.id, validated.content);
    res.status(201).json({ success: true, data: message });
  }

  async getMessages(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const beforeId = req.query.beforeId ? Number(req.query.beforeId) : undefined;

    const messages = await groupChatService.getMessages(groupId, req.user!.id, {
      limit,
      beforeId,
    });
    res.json({ success: true, data: messages });
  }

  // --- Announcements ---
  async createAnnouncement(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const validated = createGroupAnnouncementSchema.parse(req.body);
    const ann = await groupAnnouncementService.createAnnouncement(
      groupId,
      req.user!.id,
      validated
    );
    res.status(201).json({ success: true, data: ann });
  }

  async listAnnouncements(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const announcements = await groupAnnouncementService.listAnnouncements(
      groupId,
      req.user?.id
    );
    res.json({ success: true, data: announcements });
  }

  async updateAnnouncement(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const announcementId = Number(req.params.announcementId);
    if (!groupId || !announcementId) throw new BadRequestError('Invalid group or announcement ID');

    const validated = createGroupAnnouncementSchema.partial().parse(req.body);
    const updated = await groupAnnouncementService.updateAnnouncement(
      groupId,
      announcementId,
      req.user!.id,
      validated
    );
    res.json({ success: true, data: updated });
  }

  async deleteAnnouncement(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    const announcementId = Number(req.params.announcementId);
    if (!groupId || !announcementId) throw new BadRequestError('Invalid group or announcement ID');

    await groupAnnouncementService.deleteAnnouncement(groupId, announcementId, req.user!.id);
    res.json({ success: true, message: 'Announcement deleted successfully' });
  }

  // --- Analytics ---
  async getGroupAnalytics(req: Request, res: Response) {
    const groupId = Number(req.params.groupId || req.params.id);
    if (!groupId || isNaN(groupId)) throw new BadRequestError('Invalid group ID');

    const analytics = await groupAnalyticsService.getGroupAnalytics(groupId, req.user?.id);
    res.json({ success: true, data: analytics });
  }
}

export const collaborationController = new CollaborationController();
