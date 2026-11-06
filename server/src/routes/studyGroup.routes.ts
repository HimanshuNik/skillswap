import { Router } from 'express';
import { StudyGroupController } from '../controllers/studyGroup.controller.js';
import { collaborationController } from '../controllers/collaboration.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

export const studyGroupRouter = Router();
const controller = new StudyGroupController();

studyGroupRouter.get('/', optionalAuthenticate, (req, res, next) => {
  controller.listGroups(req, res).catch(next);
});

studyGroupRouter.post('/', authenticate, (req, res, next) => {
  controller.createGroup(req, res).catch(next);
});

studyGroupRouter.get('/my', authenticate, (req, res, next) => {
  controller.getUserGroups(req, res).catch(next);
});

studyGroupRouter.get('/slug/:slug', optionalAuthenticate, (req, res, next) => {
  controller.getGroupBySlug(req, res).catch(next);
});

studyGroupRouter.get('/:id', optionalAuthenticate, (req, res, next) => {
  controller.getGroupById(req, res).catch(next);
});

studyGroupRouter.post('/:id/join', authenticate, (req, res, next) => {
  controller.joinPublicGroup(req, res).catch(next);
});

studyGroupRouter.post('/:id/request', authenticate, (req, res, next) => {
  controller.requestJoinPrivateGroup(req, res).catch(next);
});

studyGroupRouter.post('/:id/members/action', authenticate, (req, res, next) => {
  controller.handleMemberAction(req, res).catch(next);
});

studyGroupRouter.post('/:id/leave', authenticate, (req, res, next) => {
  controller.leaveGroup(req, res).catch(next);
});

studyGroupRouter.get('/:id/members', optionalAuthenticate, (req, res, next) => {
  controller.getMembers(req, res).catch(next);
});

// --- Collaboration: Group Sessions ---
studyGroupRouter.post('/:id/sessions', authenticate, (req, res, next) => {
  collaborationController.createSession(req, res).catch(next);
});

studyGroupRouter.get('/:id/sessions', optionalAuthenticate, (req, res, next) => {
  collaborationController.listSessions(req, res).catch(next);
});

studyGroupRouter.get('/:id/sessions/:sessionId', optionalAuthenticate, (req, res, next) => {
  collaborationController.getSession(req, res).catch(next);
});

studyGroupRouter.patch('/:id/sessions/:sessionId', authenticate, (req, res, next) => {
  collaborationController.updateSession(req, res).catch(next);
});

studyGroupRouter.post('/:id/sessions/:sessionId/cancel', authenticate, (req, res, next) => {
  collaborationController.cancelSession(req, res).catch(next);
});

// --- Collaboration: Registration & Attendance ---
studyGroupRouter.post('/:id/sessions/:sessionId/register', authenticate, (req, res, next) => {
  collaborationController.registerSession(req, res).catch(next);
});

studyGroupRouter.post('/:id/sessions/:sessionId/unregister', authenticate, (req, res, next) => {
  collaborationController.unregisterSession(req, res).catch(next);
});

studyGroupRouter.get('/:id/sessions/:sessionId/participants', optionalAuthenticate, (req, res, next) => {
  collaborationController.listParticipants(req, res).catch(next);
});

studyGroupRouter.patch('/:id/sessions/:sessionId/participants/:participantUserId/attendance', authenticate, (req, res, next) => {
  collaborationController.updateAttendance(req, res).catch(next);
});

// --- Collaboration: Shared Resources ---
studyGroupRouter.post('/:id/resources', authenticate, (req, res, next) => {
  collaborationController.createResource(req, res).catch(next);
});

studyGroupRouter.get('/:id/resources', optionalAuthenticate, (req, res, next) => {
  collaborationController.listResources(req, res).catch(next);
});

studyGroupRouter.get('/:id/resources/:resourceId/download', authenticate, (req, res, next) => {
  collaborationController.downloadResource(req, res).catch(next);
});

studyGroupRouter.delete('/:id/resources/:resourceId', authenticate, (req, res, next) => {
  collaborationController.deleteResource(req, res).catch(next);
});

// --- Collaboration: Tasks ---
studyGroupRouter.post('/:id/tasks', authenticate, (req, res, next) => {
  collaborationController.createTask(req, res).catch(next);
});

studyGroupRouter.get('/:id/tasks', optionalAuthenticate, (req, res, next) => {
  collaborationController.listTasks(req, res).catch(next);
});

studyGroupRouter.patch('/:id/tasks/:taskId', authenticate, (req, res, next) => {
  collaborationController.updateTask(req, res).catch(next);
});

studyGroupRouter.delete('/:id/tasks/:taskId', authenticate, (req, res, next) => {
  collaborationController.deleteTask(req, res).catch(next);
});

// --- Collaboration: Milestones ---
studyGroupRouter.post('/:id/milestones', authenticate, (req, res, next) => {
  collaborationController.createMilestone(req, res).catch(next);
});

studyGroupRouter.get('/:id/milestones', optionalAuthenticate, (req, res, next) => {
  collaborationController.listMilestones(req, res).catch(next);
});

studyGroupRouter.patch('/:id/milestones/:milestoneId', authenticate, (req, res, next) => {
  collaborationController.updateMilestone(req, res).catch(next);
});

studyGroupRouter.delete('/:id/milestones/:milestoneId', authenticate, (req, res, next) => {
  collaborationController.deleteMilestone(req, res).catch(next);
});

// --- Collaboration: Chat ---
studyGroupRouter.post('/:id/messages', authenticate, (req, res, next) => {
  collaborationController.sendMessage(req, res).catch(next);
});

studyGroupRouter.get('/:id/messages', authenticate, (req, res, next) => {
  collaborationController.getMessages(req, res).catch(next);
});

// --- Collaboration: Announcements ---
studyGroupRouter.post('/:id/announcements', authenticate, (req, res, next) => {
  collaborationController.createAnnouncement(req, res).catch(next);
});

studyGroupRouter.get('/:id/announcements', optionalAuthenticate, (req, res, next) => {
  collaborationController.listAnnouncements(req, res).catch(next);
});

studyGroupRouter.patch('/:id/announcements/:announcementId', authenticate, (req, res, next) => {
  collaborationController.updateAnnouncement(req, res).catch(next);
});

studyGroupRouter.delete('/:id/announcements/:announcementId', authenticate, (req, res, next) => {
  collaborationController.deleteAnnouncement(req, res).catch(next);
});

// --- Collaboration: Analytics ---
studyGroupRouter.get('/:id/analytics', optionalAuthenticate, (req, res, next) => {
  collaborationController.getGroupAnalytics(req, res).catch(next);
});


