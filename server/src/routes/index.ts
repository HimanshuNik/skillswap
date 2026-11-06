import { Router } from 'express';
import { healthRouter } from './health.routes.js';
import { authRouter } from './auth.routes.js';
import { skillRouter } from './skill.routes.js';
import { onboardingRouter } from './onboarding.routes.js';
import { userRouter } from './user.routes.js';
import { matchRouter } from './match.routes.js';
import { swapRequestRouter } from './swapRequest.routes.js';
import { conversationRouter } from './conversation.routes.js';
import { sessionRouter } from './session.routes.js';
import { reviewRouter } from './review.routes.js';
import { notificationRouter } from './notification.routes.js';
import { dashboardRouter } from './dashboard.routes.js';
import adminRouter from './admin.routes.js';
import reportRouter from './report.routes.js';
import { billingRouter } from './billing.routes.js';
import { aiRouter } from './ai.routes.js';
import { gamificationRouter } from './gamification.routes.js';
import { learningAnalyticsRouter } from './learningAnalytics.routes.js';
import { learningGoalRouter } from './learningGoal.routes.js';
import { communityRouter } from './community.routes.js';
import { studyGroupRouter } from './studyGroup.routes.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/skills', skillRouter);
apiRouter.use('/onboarding', onboardingRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/matches', matchRouter);
apiRouter.use('/swap-requests', swapRequestRouter);
apiRouter.use('/conversations', conversationRouter);
apiRouter.use('/sessions', sessionRouter);
apiRouter.use('/reviews', reviewRouter);
apiRouter.use('/notifications', notificationRouter);
apiRouter.use('/dashboard', dashboardRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/billing', billingRouter);
apiRouter.use('/ai', aiRouter);
apiRouter.use('/gamification', gamificationRouter);
apiRouter.use('/learning-analytics', learningAnalyticsRouter);
apiRouter.use('/learning-goals', learningGoalRouter);
apiRouter.use('/community/groups', studyGroupRouter);
apiRouter.use('/community', communityRouter);


