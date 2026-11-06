import {
  reviewRepository,
  type ReviewRecord,
  type ReviewWithDetails,
  type UserReputation,
} from '../repositories/review.repository.js';
import { sessionRepository } from '../repositories/session.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { notificationService } from './notification.service.js';
import { gamificationService } from './gamification/gamification.service.js';
import type { CreateReviewInput, ReviewQueryInput } from '../validators/review.validator.js';
import {
  NotFoundError,
  BadRequestError,
  ForbiddenError,
  ConflictError,
} from '../utils/errors.js';
import { logger } from '../config/logger.js';

export class ReviewService {
  /**
   * Submits a review for a verified completed session.
   */
  async createReview(
    reviewerId: number,
    input: CreateReviewInput
  ): Promise<ReviewWithDetails> {
    // 1. Session must exist
    const session = await sessionRepository.findById(input.sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    // 2. Session must be COMPLETED
    if (session.status !== 'COMPLETED') {
      throw new BadRequestError('Reviews can only be submitted for completed sessions');
    }

    // 3. Reviewer must be the learner of this session
    if (session.learnerId !== reviewerId) {
      throw new ForbiddenError(
        'Only the learner of this session is authorized to review the teacher'
      );
    }

    // 4. Reviewee is strictly the teacher
    const revieweeId = session.teacherId;

    // 5. Reviewer cannot review themselves
    if (reviewerId === revieweeId) {
      throw new BadRequestError('You cannot review yourself');
    }

    // 6. Prevent duplicate reviews for the same session by the same reviewer
    const existing = await reviewRepository.findBySessionAndReviewer(
      input.sessionId,
      reviewerId
    );
    if (existing) {
      throw new ConflictError('You have already submitted a review for this session');
    }

    // 7. Create review
    const review = await reviewRepository.create({
      sessionId: input.sessionId,
      reviewerId,
      revieweeId,
      rating: input.rating,
      comment: input.comment || null,
    });

    // 8. Recalculate reputation & update User record
    const reputation = await reviewRepository.calculateReputation(revieweeId);
    await userRepository.updateReputation(revieweeId, {
      averageRating: reputation.averageRating,
      totalReviews: reputation.totalReviews,
    });

    // Phase 19 Gamification: award XP and evaluate achievements for reviewer
    try {
      await gamificationService.onReviewSubmitted({
        authorId: reviewerId,
        sessionId: input.sessionId,
      });
    } catch (err: any) {
      logger.warn(`Failed to process gamification review submission: ${err.message}`);
    }

    // 9. Send notification to the teacher
    const reviewer = await userRepository.findById(reviewerId);
    const reviewerName = reviewer?.name || 'A student';
    try {
      await notificationService.createNotification({
        userId: revieweeId,
        type: 'REVIEW_RECEIVED',
        title: 'New Review Received',
        message: `${reviewerName} gave you a ${input.rating}-star review!`,
        linkUrl: `/profile`,
        relatedEntityType: 'REVIEW',
        relatedEntityId: review.id,
      });
    } catch (err: any) {
      logger.warn(`[ReviewService] Failed to dispatch review notification: ${err.message}`);
    }

    const populated = await reviewRepository.populateDetails([review]);
    return populated[0];
  }

  /**
   * Retrieves paginated reviews for a user.
   */
  async getUserReviews(
    userId: number,
    query: ReviewQueryInput
  ): Promise<{
    reviews: ReviewWithDetails[];
    total: number;
    page: number;
    limit: number;
    reputation: UserReputation;
  }> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const reviewData = await reviewRepository.findByReviewee(userId, query);
    const reputation = await reviewRepository.calculateReputation(userId);

    return {
      ...reviewData,
      reputation,
    };
  }

  /**
   * Retrieves review(s) for a specific session.
   */
  async getSessionReviews(
    sessionId: number,
    currentUserId: number
  ): Promise<ReviewWithDetails[]> {
    const session = await sessionRepository.findById(sessionId);
    if (!session) {
      throw new NotFoundError('Session not found');
    }

    if (session.teacherId !== currentUserId && session.learnerId !== currentUserId) {
      throw new ForbiddenError('You are not authorized to view reviews for this session');
    }

    const reviews = await reviewRepository.findBySessionId(sessionId);
    return reviewRepository.populateDetails(reviews);
  }

  /**
   * Retrieves a user's calculated reputation.
   */
  async getUserReputation(userId: number): Promise<UserReputation> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    return reviewRepository.calculateReputation(userId);
  }
}

export const reviewService = new ReviewService();

