import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { pushController } from '../controllers/push.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const notificationRouter = Router();

// Public push key retrieval for PWA client registration (before authenticate)
notificationRouter.get('/push/public-key', (req, res, next) =>
  pushController.getPublicKey(req, res, next)
);

// All other notification routes require authentication
notificationRouter.use(authenticate);

// --- Push Notification Endpoints ---
notificationRouter.post('/push/subscribe', (req, res, next) =>
  pushController.subscribe(req, res, next)
);

notificationRouter.post('/push/unsubscribe', (req, res, next) =>
  pushController.unsubscribe(req, res, next)
);

notificationRouter.get('/push/subscriptions', (req, res, next) =>
  pushController.getSubscriptions(req, res, next)
);

notificationRouter.post('/push/test', (req, res, next) =>
  pushController.sendTestPush(req, res, next)
);

// --- Core In-App Notification Endpoints ---
// Get paginated notifications for authenticated user
notificationRouter.get('/', (req, res, next) =>
  notificationController.getUserNotifications(req, res, next)
);

// Get unread notification count
notificationRouter.get('/unread-count', (req, res, next) =>
  notificationController.getUnreadCount(req, res, next)
);

// Mark a single notification as read
notificationRouter.patch('/:id/read', (req, res, next) =>
  notificationController.markAsRead(req, res, next)
);

// Mark all notifications as read
notificationRouter.patch('/read-all', (req, res, next) =>
  notificationController.markAllAsRead(req, res, next)
);

