import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { reviewController } from '../controllers/review.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

export const userRouter = Router();

// User discovery directory
userRouter.get('/', optionalAuthenticate, (req, res, next) =>
  userController.getDiscoverUsers(req, res, next)
);

// User reputation metrics
userRouter.get('/:userId/reputation', (req, res, next) =>
  reviewController.getUserReputation(req, res, next)
);

// Current authenticated user profile
userRouter.get('/me', authenticate, (req, res, next) => userController.getMe(req, res, next));
userRouter.patch('/me', authenticate, (req, res, next) => userController.updateMe(req, res, next));
userRouter.delete('/me', authenticate, (req, res, next) => userController.deleteMe(req, res, next));

// Notification preferences
userRouter.get('/me/notification-preferences', authenticate, (req, res, next) =>
  userController.getNotificationPreferences(req, res, next)
);
userRouter.patch('/me/notification-preferences', authenticate, (req, res, next) =>
  userController.updateNotificationPreferences(req, res, next)
);

// Teaching skills management
userRouter.post('/me/skills/teaching', authenticate, (req, res, next) =>
  userController.addTeachingSkill(req, res, next)
);
userRouter.delete('/me/skills/teaching/:skillId', authenticate, (req, res, next) =>
  userController.removeTeachingSkill(req, res, next)
);

// Learning skills management
userRouter.post('/me/skills/learning', authenticate, (req, res, next) =>
  userController.addLearningSkill(req, res, next)
);
userRouter.delete('/me/skills/learning/:skillId', authenticate, (req, res, next) =>
  userController.removeLearningSkill(req, res, next)
);

// Availability management
userRouter.patch('/me/availability', authenticate, (req, res, next) =>
  userController.updateAvailability(req, res, next)
);

// Public profile lookup by username
userRouter.get('/:username', (req, res, next) => userController.getPublicProfile(req, res, next));

