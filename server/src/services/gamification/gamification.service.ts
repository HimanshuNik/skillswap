import { xpRepository, calculateLevelFromXP } from '../../repositories/xp.repository.js';
import { achievementRepository } from '../../repositories/achievement.repository.js';
import { learningGoalRepository } from '../../repositories/learningGoal.repository.js';
import { streakRepository } from '../../repositories/streak.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { notificationService } from '../notification.service.js';
import { db } from '../../prisma/db.js';
import { logger } from '../../config/logger.js';

export class GamificationService {
  /**
   * Helper to award XP and dispatch level-up notifications if threshold crossed.
   */
  async awardXP(params: {
    userId: number;
    amount: number;
    actionType: string;
    idempotencyKey: string;
    description: string;
    metadata?: Record<string, any>;
  }) {
    const result = await xpRepository.addXPTransaction(params);

    if (result.leveledUp) {
      const levelInfo = calculateLevelFromXP(result.userXP.totalXp);
      try {
        await notificationService.createNotification({
          userId: params.userId,
          type: 'LEVEL_UP',
          title: `Level Up! Reached Level ${result.newLevel}`,
          message: `Congratulations! You leveled up to Level ${result.newLevel} (${levelInfo.title})!`,
          linkUrl: '/learning-analytics',
          relatedEntityType: 'GAMIFICATION',
          relatedEntityId: result.newLevel,
        });
      } catch (err: any) {
        logger.warn(`Failed to dispatch level-up notification: ${err.message}`);
      }
    }

    return result;
  }

  /**
   * Unlocks an achievement, awards its configured XP reward, and notifies the user.
   */
  async awardAchievement(userId: number, code: string) {
    const awardResult = await achievementRepository.awardAchievement(userId, code);
    if (!awardResult.awarded || !awardResult.achievement) {
      return awardResult;
    }

    const ach = awardResult.achievement;

    // Award bonus XP for unlocking achievement if reward > 0
    if (ach.xpReward > 0) {
      await this.awardXP({
        userId,
        amount: ach.xpReward,
        actionType: 'ACHIEVEMENT_UNLOCKED',
        idempotencyKey: `ACHIEVEMENT:${code}:${userId}`,
        description: `Unlocked achievement: ${ach.title}`,
        metadata: { achievementCode: code, category: ach.category },
      });
    }

    // Send in-app notification
    try {
      await notificationService.createNotification({
        userId,
        type: 'ACHIEVEMENT_UNLOCKED',
        title: `Achievement Unlocked: ${ach.title}!`,
        message: ach.description,
        linkUrl: '/learning-analytics',
        relatedEntityType: 'ACHIEVEMENT',
        relatedEntityId: ach.id,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch achievement notification: ${err.message}`);
    }

    return awardResult;
  }

  /**
   * Event handler for confirmed session completion.
   */
  async onSessionCompleted(params: {
    sessionId: number;
    teacherId: number;
    learnerId: number;
    durationMinutes: number;
    skillId?: number | null;
  }) {
    const { sessionId, teacherId, learnerId, durationMinutes, skillId } = params;

    // 1. Award 40 XP to Learner
    await this.awardXP({
      userId: learnerId,
      amount: 40,
      actionType: 'SESSION_LEARN',
      idempotencyKey: `SESSION_LEARN:${sessionId}`,
      description: `Completed verified learning session #${sessionId}`,
      metadata: { sessionId, durationMinutes, skillId, role: 'learner' },
    });

    // 2. Award 40 XP to Teacher
    await this.awardXP({
      userId: teacherId,
      amount: 40,
      actionType: 'SESSION_TEACH',
      idempotencyKey: `SESSION_TEACH:${sessionId}`,
      description: `Completed verified teaching session #${sessionId}`,
      metadata: { sessionId, durationMinutes, skillId, role: 'teacher' },
    });

    // 3. Update Streaks for both users
    const teacherUser = await userRepository.findById(teacherId);
    const learnerUser = await userRepository.findById(learnerId);

    const teacherStreak = await streakRepository.recordDailyActivity(
      teacherId,
      teacherUser?.timezone || 'UTC'
    );
    const learnerStreak = await streakRepository.recordDailyActivity(
      learnerId,
      learnerUser?.timezone || 'UTC'
    );

    // Check streak achievements
    if (teacherStreak.currentStreak >= 7) {
      await this.awardAchievement(teacherId, 'STREAK_WARRIOR');
    }
    if (learnerStreak.currentStreak >= 7) {
      await this.awardAchievement(learnerId, 'STREAK_WARRIOR');
    }

    // 4. Update Learner's active learning goals
    try {
      const activeGoals = await learningGoalRepository.findByUserId(learnerId, 'IN_PROGRESS');
      const hours = Math.max(1, Math.round(durationMinutes / 60));

      for (const goal of activeGoals) {
        if (!goal.isAutomated) continue;

        let shouldIncrement = false;
        let incValue = 1;

        if (goal.goalType === 'SESSIONS_COUNT') {
          if (!goal.skillId || goal.skillId === skillId) {
            shouldIncrement = true;
            incValue = 1;
          }
        } else if (goal.goalType === 'HOURS_COUNT') {
          if (!goal.skillId || goal.skillId === skillId) {
            shouldIncrement = true;
            incValue = hours;
          }
        }

        if (shouldIncrement) {
          const res = await learningGoalRepository.incrementProgress(goal.id, learnerId, incValue);
          if (res.justCompleted) {
            await this.onGoalCompleted({ userId: learnerId, goalId: goal.id });
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Error auto-progressing learning goals: ${err.message}`);
    }

    // 5. Evaluate Session & Skill Achievements for both users
    await this.checkSessionAchievements(learnerId);
    await this.checkSessionAchievements(teacherId);
  }

  /**
   * Event handler for reciprocal swap request completion.
   */
  async onFirstSwapCompleted(params: { swapRequestId: number; userAId: number; userBId: number }) {
    const { swapRequestId, userAId, userBId } = params;

    for (const uid of [userAId, userBId]) {
      const existingTx = await db.orm.public.XPTransaction.where({
        userId: uid,
        actionType: 'FIRST_SWAP',
      }).first();

      if (!existingTx) {
        await this.awardAchievement(uid, 'FIRST_SWAP');
      }
    }
  }

  /**
   * Event handler for roadmap milestone completion.
   */
  async onMilestoneCompleted(params: {
    userId: number;
    roadmapId: number;
    milestoneId: number;
    isRoadmapFinished?: boolean;
  }) {
    const { userId, roadmapId, milestoneId, isRoadmapFinished } = params;

    // 1. Award 15 XP for milestone
    await this.awardXP({
      userId,
      amount: 15,
      actionType: 'MILESTONE_COMPLETE',
      idempotencyKey: `MILESTONE:${milestoneId}`,
      description: `Completed roadmap milestone #${milestoneId}`,
      metadata: { roadmapId, milestoneId },
    });

    // 2. Daily active streak
    const user = await userRepository.findById(userId);
    await streakRepository.recordDailyActivity(userId, user?.timezone || 'UTC');

    // 3. Progress ROADMAP_MILESTONES learning goals
    try {
      const activeGoals = await learningGoalRepository.findByUserId(userId, 'IN_PROGRESS');
      for (const goal of activeGoals) {
        if (goal.isAutomated && goal.goalType === 'ROADMAP_MILESTONES') {
          const res = await learningGoalRepository.incrementProgress(goal.id, userId, 1);
          if (res.justCompleted) {
            await this.onGoalCompleted({ userId, goalId: goal.id });
          }
        }
      }
    } catch (err: any) {
      logger.warn(`Error progressing roadmap milestone goals: ${err.message}`);
    }

    // 4. If roadmap reached 100%, award ROADMAP_FINISHER
    if (isRoadmapFinished) {
      await this.awardAchievement(userId, 'ROADMAP_FINISHER');
    }
  }

  /**
   * Event handler for review submission.
   */
  async onReviewSubmitted(params: { authorId: number; sessionId: number }) {
    const { authorId, sessionId } = params;

    // Award 10 XP for submitting a review
    await this.awardXP({
      userId: authorId,
      amount: 10,
      actionType: 'FIRST_REVIEW',
      idempotencyKey: `REVIEW:${sessionId}`,
      description: `Submitted review for session #${sessionId}`,
      metadata: { sessionId },
    });

    // Check review count for COMMUNITY_CONTRIBUTOR (5 reviews)
    const reviewList = await db.orm.public.Review.where({ reviewerId: authorId }).all();
    if (reviewList.length >= 5) {
      await this.awardAchievement(authorId, 'COMMUNITY_CONTRIBUTOR');
    }
  }

  /**
   * Event handler for learning goal completion.
   */
  async onGoalCompleted(params: { userId: number; goalId: number }) {
    const { userId, goalId } = params;

    // Award 50 XP
    await this.awardXP({
      userId,
      amount: 50,
      actionType: 'GOAL_COMPLETE',
      idempotencyKey: `GOAL:${goalId}`,
      description: `Completed personal learning goal #${goalId}`,
      metadata: { goalId },
    });

    try {
      const goal = await learningGoalRepository.findById(goalId);
      await notificationService.createNotification({
        userId,
        type: 'GOAL_COMPLETED',
        title: 'Learning Goal Completed! 🎯',
        message: `Great job! You successfully completed your goal: "${goal?.title || 'Learning Goal'}" (+50 XP).`,
        linkUrl: '/learning-analytics',
        relatedEntityType: 'LEARNING_GOAL',
        relatedEntityId: goalId,
      });
    } catch (err: any) {
      logger.warn(`Failed to dispatch goal completion notification: ${err.message}`);
    }

    // Check GOAL_CRUSHER achievement (3 completed goals)
    const completedGoalsCount = await learningGoalRepository.countCompletedGoals(userId);
    if (completedGoalsCount >= 3) {
      await this.awardAchievement(userId, 'GOAL_CRUSHER');
    }
  }

  /**
   * Evaluates session counts and distinct skills learned/taught.
   */
  private async checkSessionAchievements(userId: number) {
    const allCompleted = await db.orm.public.Session.where({
      status: 'COMPLETED',
    }).all();

    let learnSessionsCount = 0;
    let teachSessionsCount = 0;
    const learnedSkillsSet = new Set<number>();

    for (const s of allCompleted) {
      if (s.learnerId === userId) {
        learnSessionsCount++;
        if (s.skillId) learnedSkillsSet.add(s.skillId);
      }
      if (s.teacherId === userId) {
        teachSessionsCount++;
      }
    }

    // Learner thresholds: 10, 50
    if (learnSessionsCount >= 10) {
      await this.awardAchievement(userId, 'DEDICATED_LEARNER');
    }
    if (learnSessionsCount >= 50) {
      await this.awardAchievement(userId, 'LEARNING_CHAMPION');
    }

    // Teacher thresholds: 10, 25
    if (teachSessionsCount >= 10) {
      await this.awardAchievement(userId, 'HELPFUL_MENTOR');
    }
    if (teachSessionsCount >= 25) {
      await this.awardAchievement(userId, 'KNOWLEDGE_SHARER');
    }

    // Skill explorer: 3 distinct learned skills
    if (learnedSkillsSet.size >= 3) {
      await this.awardAchievement(userId, 'SKILL_EXPLORER');
    }
  }
}

export const gamificationService = new GamificationService();
