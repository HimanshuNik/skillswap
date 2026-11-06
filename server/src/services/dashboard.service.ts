import { db } from '../prisma/db.js';
import { userRepository } from '../repositories/user.repository.js';
import { swapRequestRepository } from '../repositories/swapRequest.repository.js';
import { sessionRepository, type SessionWithDetails } from '../repositories/session.repository.js';
import { conversationRepository } from '../repositories/conversation.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { reviewRepository } from '../repositories/review.repository.js';
import { userSkillRepository } from '../repositories/userSkill.repository.js';
import { userAvailabilityRepository } from '../repositories/userAvailability.repository.js';
import { discoveryService } from './discovery.service.js';
import { calculateProfileCompletion, type ProfileCompletion } from '../utils/profileCompletion.js';
import { NotFoundError } from '../utils/errors.js';
import type { MatchResult } from './matching.service.js';

export interface DashboardSummary {
  completedSessions: number;
  activeSwaps: number;
  completedSwaps: number;
  upcomingSessionsCount: number;
  pendingRequestsCount: number;
  unreadMessagesCount: number;
  unreadNotificationsCount: number;
  averageRating: number;
  totalReviews: number;
  teachingSkillsCount: number;
  learningSkillsCount: number;
  profileCompletion: ProfileCompletion;
}

export interface ActivityItem {
  id: string;
  type: 'SWAP_REQUEST' | 'SESSION' | 'REVIEW' | 'NOTIFICATION';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
  link: string;
  metadata?: Record<string, any>;
}

export interface AggregatedDashboard {
  summary: DashboardSummary;
  recommendations: MatchResult[];
  upcomingSessions: SessionWithDetails[];
  nextSession: SessionWithDetails | null;
  recentActivity: ActivityItem[];
  profileCompletion: ProfileCompletion;
}

export class DashboardService {
  async getSummary(userId: number): Promise<DashboardSummary> {
    const [
      user,
      teachingSkills,
      learningSkills,
      schedule,
      sentSwaps,
      receivedSwaps,
      allSessions,
      unreadMessagesCount,
      unreadNotificationsCount,
    ] = await Promise.all([
      userRepository.findById(userId),
      userSkillRepository.findTeachingSkillsByUser(userId),
      userSkillRepository.findLearningSkillsByUser(userId),
      userAvailabilityRepository.findByUser(userId),
      db.orm.public.SwapRequest.where({ senderId: userId }).all(),
      db.orm.public.SwapRequest.where({ receiverId: userId }).all(),
      sessionRepository.findByUser(userId, { filter: 'all' }),
      conversationRepository.countTotalUnreadForUser(userId),
      notificationRepository.countUnread(userId),
    ]);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const hasAvailability = schedule.some((d) => d.slots.length > 0);

    const profileCompletion = calculateProfileCompletion({
      user,
      teachingSkillsCount: teachingSkills.length,
      learningSkillsCount: learningSkills.length,
      hasAvailability,
    });

    // Targeted Swap Requests stats
    const userSwaps = [...(sentSwaps as any[]), ...(receivedSwaps as any[])];

    const activeSwaps = userSwaps.filter((s) =>
      ['ACCEPTED', 'IN_PROGRESS'].includes(s.status)
    ).length;
    const completedSwaps = userSwaps.filter((s) => s.status === 'COMPLETED').length;
    const pendingRequestsCount = userSwaps.filter(
      (s) => s.receiverId === userId && s.status === 'PENDING'
    ).length;

    // Sessions stats
    const completedSessions = allSessions.filter((s) => s.status === 'COMPLETED').length;
    const upcomingSessionsCount = allSessions.filter((s) =>
      ['SCHEDULED', 'RESCHEDULE_PROPOSED', 'IN_PROGRESS'].includes(s.status)
    ).length;

    return {
      completedSessions: completedSessions || user.completedSessions || 0,
      activeSwaps,
      completedSwaps,
      upcomingSessionsCount,
      pendingRequestsCount,
      unreadMessagesCount,
      unreadNotificationsCount,
      averageRating: Number(user.averageRating) || 0,
      totalReviews: user.totalReviews || 0,
      teachingSkillsCount: teachingSkills.length,
      learningSkillsCount: learningSkills.length,
      profileCompletion,
    };
  }

  async getRecommendations(userId: number, limit = 3): Promise<MatchResult[]> {
    const result = await discoveryService.getMatches(userId, limit);
    return result.matches;
  }

  async getUpcomingSessions(userId: number, limit = 5): Promise<SessionWithDetails[]> {
    const upcoming = await sessionRepository.findByUser(userId, { filter: 'upcoming' });
    return upcoming.slice(0, limit);
  }

  async getActivity(userId: number, limit = 10): Promise<ActivityItem[]> {
    const activities: ActivityItem[] = [];

    // 1. Swap requests activity
    const incomingSwaps = await swapRequestRepository.findIncoming(userId);
    for (const swap of incomingSwaps.slice(0, 5)) {
      activities.push({
        id: `swap-in-${swap.id}`,
        type: 'SWAP_REQUEST',
        title: `Swap request from ${swap.sender.name}`,
        description: `Wants to learn ${swap.receiverSkill.name} in exchange for ${swap.senderSkill.name}`,
        timestamp: swap.createdAt,
        status: swap.status,
        link: '/requests',
        metadata: { swapRequestId: swap.id },
      });
    }

    const outgoingSwaps = await swapRequestRepository.findOutgoing(userId);
    for (const swap of outgoingSwaps.slice(0, 5)) {
      activities.push({
        id: `swap-out-${swap.id}`,
        type: 'SWAP_REQUEST',
        title: `Swap request to ${swap.receiver.name}`,
        description: `Requested to learn ${swap.receiverSkill.name}`,
        timestamp: swap.createdAt,
        status: swap.status,
        link: '/requests',
        metadata: { swapRequestId: swap.id },
      });
    }

    // 2. Sessions activity
    const sessions = await sessionRepository.findByUser(userId, { filter: 'all' });
    for (const sess of sessions.slice(0, 8)) {
      const isTeacher = sess.teacherId === userId;
      const partner = isTeacher ? sess.learner : sess.teacher;
      const roleText = isTeacher ? 'Teaching' : 'Learning';

      activities.push({
        id: `sess-${sess.id}`,
        type: 'SESSION',
        title: `${roleText} session with ${partner.name}`,
        description: `Skill: ${sess.skill.name} • Status: ${sess.status}`,
        timestamp: sess.updatedAt || sess.createdAt,
        status: sess.status,
        link: '/sessions',
        metadata: { sessionId: sess.id },
      });
    }

    // 3. Reviews received
    const reviews = await reviewRepository.findByReviewee(userId, { page: 1, limit: 5 });
    for (const rev of reviews.reviews) {
      activities.push({
        id: `rev-${rev.id}`,
        type: 'REVIEW',
        title: `Received a ${rev.rating}-star review`,
        description: rev.comment ? `"${rev.comment.slice(0, 60)}..."` : 'Great session feedback!',
        timestamp: rev.createdAt,
        link: `/profile/${rev.reviewer.username}`,
        metadata: { rating: rev.rating },
      });
    }

    // 4. Notifications
    const notifications = await notificationRepository.findByUser(userId, { limit: 5 });
    for (const notif of notifications.notifications) {
      activities.push({
        id: `notif-${notif.id}`,
        type: 'NOTIFICATION',
        title: notif.title,
        description: notif.message,
        timestamp: notif.createdAt,
        link: notif.linkUrl || '/dashboard',
        metadata: { type: notif.type, isRead: notif.isRead },
      });
    }

    // Sort descending by timestamp
    activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return activities.slice(0, limit);
  }

  async getAggregatedDashboard(userId: number): Promise<AggregatedDashboard> {
    const [summary, recommendations, upcomingSessions, recentActivity] = await Promise.all([
      this.getSummary(userId),
      this.getRecommendations(userId, 3),
      this.getUpcomingSessions(userId, 3),
      this.getActivity(userId, 8),
    ]);

    return {
      summary,
      recommendations,
      upcomingSessions,
      nextSession: upcomingSessions[0] || null,
      recentActivity,
      profileCompletion: summary.profileCompletion,
    };
  }
}

export const dashboardService = new DashboardService();
