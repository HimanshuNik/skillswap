import { Router } from 'express';
import { learningGoalController } from '../controllers/learningGoal.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const learningGoalRouter = Router();

// List user learning goals
learningGoalRouter.get('/', authenticate, (req, res, next) => {
  learningGoalController.getGoals(req, res, next).catch(next);
});

// Create learning goal
learningGoalRouter.post('/', authenticate, (req, res, next) => {
  learningGoalController.createGoal(req, res, next).catch(next);
});

// Update learning goal (progress, title, status, etc.)
learningGoalRouter.patch('/:id', authenticate, (req, res, next) => {
  learningGoalController.updateGoal(req, res, next).catch(next);
});

// Delete learning goal
learningGoalRouter.delete('/:id', authenticate, (req, res, next) => {
  learningGoalController.deleteGoal(req, res, next).catch(next);
});

