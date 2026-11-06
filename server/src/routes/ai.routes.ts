import { Router } from 'express';
import { aiController } from '../controllers/ai.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const aiRouter = Router();

// Public skill similarity analyzer
aiRouter.post('/similarity', (req, res, next) => {
  aiController.analyzeSimilarity(req, res).catch(next);
});

// Authenticated AI capabilities
aiRouter.get('/recommendations', authenticate, (req, res, next) => {
  aiController.getRecommendations(req, res).catch(next);
});

aiRouter.post('/recommendations/feedback', authenticate, (req, res, next) => {
  aiController.submitFeedback(req, res).catch(next);
});

aiRouter.post('/roadmaps', authenticate, (req, res, next) => {
  aiController.createRoadmap(req, res).catch(next);
});

aiRouter.get('/roadmaps', authenticate, (req, res, next) => {
  aiController.getUserRoadmaps(req, res).catch(next);
});

aiRouter.get('/roadmaps/:id', authenticate, (req, res, next) => {
  aiController.getRoadmapById(req, res).catch(next);
});

aiRouter.patch('/roadmaps/:id/milestones/:milestoneId', authenticate, (req, res, next) => {
  aiController.updateMilestone(req, res).catch(next);
});

aiRouter.delete('/roadmaps/:id', authenticate, (req, res, next) => {
  aiController.deleteRoadmap(req, res).catch(next);
});

aiRouter.get('/scheduling/suggestions', authenticate, (req, res, next) => {
  aiController.getSmartSchedulingSuggestions(req, res).catch(next);
});

aiRouter.post('/assistant/chat', authenticate, (req, res, next) => {
  aiController.chatWithAssistant(req, res).catch(next);
});

// Admin AI overview
aiRouter.get('/admin/overview', authenticate, requireAdmin, (req, res, next) => {
  aiController.getAdminAIOverview(req, res).catch(next);
});

