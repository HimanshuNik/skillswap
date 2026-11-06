import { Router } from 'express';
import { conversationController } from '../controllers/conversation.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const conversationRouter = Router();

// All conversation endpoints require authentication
conversationRouter.use(authenticate);

// Get list of all conversations for the user
conversationRouter.get('/', (req, res, next) =>
  conversationController.getConversations(req, res, next)
);

// Get total unread messages count for navbar/badge
conversationRouter.get('/unread-count', (req, res, next) =>
  conversationController.getUnreadCount(req, res, next)
);

// Get messages for a specific conversation
conversationRouter.get('/:id/messages', (req, res, next) =>
  conversationController.getMessages(req, res, next)
);

// Send a message via REST (fallback / standard API)
conversationRouter.post('/:id/messages', (req, res, next) =>
  conversationController.sendMessage(req, res, next)
);

// Mark conversation messages as read
conversationRouter.patch('/:id/read', (req, res, next) =>
  conversationController.markAsRead(req, res, next)
);

