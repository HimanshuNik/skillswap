import { Router } from 'express';
import { CommunityController } from '../controllers/community.controller.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.middleware.js';

export const communityRouter = Router();
const controller = new CommunityController();

// Community Analytics Overview
communityRouter.get('/analytics', optionalAuthenticate, (req, res, next) => {
  controller.getAnalytics(req, res).catch(next);
});

// Voting
communityRouter.post('/vote', authenticate, (req, res, next) => {
  controller.toggleVote(req, res).catch(next);
});

// Reporting
communityRouter.post('/report', authenticate, (req, res, next) => {
  controller.reportContent(req, res).catch(next);
});

// Discussion Posts CRUD
communityRouter.get('/posts', optionalAuthenticate, (req, res, next) => {
  controller.listPosts(req, res).catch(next);
});

communityRouter.post('/posts', authenticate, (req, res, next) => {
  controller.createPost(req, res).catch(next);
});

communityRouter.get('/posts/:id', optionalAuthenticate, (req, res, next) => {
  controller.getPostById(req, res).catch(next);
});

communityRouter.patch('/posts/:id', authenticate, (req, res, next) => {
  controller.updatePost(req, res).catch(next);
});

communityRouter.delete('/posts/:id', authenticate, (req, res, next) => {
  controller.deletePost(req, res).catch(next);
});

// Comments & Threaded Replies
communityRouter.get('/posts/:id/comments', optionalAuthenticate, (req, res, next) => {
  controller.getComments(req, res).catch(next);
});

communityRouter.post('/posts/:id/comments', authenticate, (req, res, next) => {
  controller.createComment(req, res).catch(next);
});

communityRouter.patch('/posts/:id/comments/:commentId', authenticate, (req, res, next) => {
  controller.updateComment(req, res).catch(next);
});

communityRouter.delete('/posts/:id/comments/:commentId', authenticate, (req, res, next) => {
  controller.deleteComment(req, res).catch(next);
});

// Accepted Answers (Questions)
communityRouter.post('/posts/:id/comments/:commentId/accept', authenticate, (req, res, next) => {
  controller.markAcceptedAnswer(req, res).catch(next);
});

communityRouter.delete('/posts/:id/accept', authenticate, (req, res, next) => {
  controller.unmarkAcceptedAnswer(req, res).catch(next);
});

