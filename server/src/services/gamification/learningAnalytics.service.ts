import { xpRepository, calculateLevelFromXP } from '../../repositories/xp.repository.js';
import { achievementRepository } from '../../repositories/achievement.repository.js';
import { learningGoalRepository } from '../../repositories/learningGoal.repository.js';
import { streakRepository, getDateStringInTimezone } from '../../repositories/streak.repository.js';
import { gamificationPrivacyRepository } from '../../repositories/gamificationPrivacy.repository.js';
import { userRepository } from '../../repositories/user.repository.js';
import { db } from '../../prisma/db.js';

export class LearningAnalyticsService {
  /**
   * Retrieves high-level analytics overview for the authenticated user.
   */
  async getOverview(userId: number, rangeDays: number = 30) {
    const userXP = await xpRepository.getOrCreateUserXP(userId);
    const levelInfo = calculateLevelFromXP(userXP.totalXp);

    const now = new Date();
    const startDate = rangeDays > 0 ? new Date(now.getTime() - rangeDays * 24 * 60 * 60 * 1000) : undefined;

    // Fetch XP earned in the date range
    const xpEarnedInRange = await xpRepository.getXPEarnedInRange(userId, startDate, now);

    // Fetch user sessions
    const allSessions = await db.orm.public.Session.where({ status: 'COMPLETED' }).all();

    let totalLearningMinutes = 0;
    let totalTeachingMinutes = 0;
    let rangeLearningMinutes = 0;
    let rangeTeachingMinutes = 0;
    let totalLearningSessions = 0;
    let totalTeachingSessions = 0;
    let rangeLearningSessions = 0;
    let rangeTeachingSessions = 0;

    for (const s of allSessions) {
      const sessionDate = new Date(s.completedAt || s.createdAt);
      const inRange = !startDate || sessionDate >= startDate;

      if (s.learnerId === userId) {
        totalLearningSessions++;
        totalLearningMinutes += s.duration || 60;
        if (inRange) {
          rangeLearningSessions++;
          rangeLearningMinutes += s.duration || 60;
        }
      }

      if (s.teacherId === userId) {
        totalTeachingSessions++;
        totalTeachingMinutes += s.duration || 60;
        if (inRange) {
          rangeTeachingSessions++;
          rangeTeachingMinutes += s.duration || 60;
        }
      }
    }

    // Achievements summary
    const allAchievements = await achievementRepository.getAllAchievements();
    const userAchievements = await achievementRepository.getUserAchievements(userId);

    // Goals summary
    const activeGoals = await learningGoalRepository.findByUserId(userId, 'IN_PROGRESS');
    const completedGoals = await learningGoalRepository.findByUserId(userId, 'COMPLETED');

    // Streak
    const streak = await streakRepository.getOrCreateStreak(userId);

    // Privacy
    const privacy = await gamificationPrivacyRepository.getOrCreatePrivacy(userId);

    return {
      rangeDays,
      levelInfo: {
        currentLevel: levelInfo.level,
        title: levelInfo.title,
        totalXp: userXP.totalXp,
        currentLevelXp: levelInfo.currentLevelXp,
        nextLevelXp: levelInfo.nextLevelXp,
        xpInCurrentLevel: levelInfo.xpInCurrentLevel,
        xpRequiredForNextLevel: levelInfo.xpRequiredForNextLevel,
        progressPercent: levelInfo.progressPercent,
      },
      xp: {
        totalXp: userXP.totalXp,
        earnedInRange: xpEarnedInRange,
      },
      sessions: {
        totalCompleted: totalLearningSessions + totalTeachingSessions,
        totalLearningSessions,
        totalTeachingSessions,
        rangeCompleted: rangeLearningSessions + rangeTeachingSessions,
        rangeLearningSessions,
        rangeTeachingSessions,
      },
      hours: {
        totalLearningHours: Math.round((totalLearningMinutes / 60) * 10) / 10,
        totalTeachingHours: Math.round((totalTeachingMinutes / 60) * 10) / 10,
        totalHours: Math.round(((totalLearningMinutes + totalTeachingMinutes) / 60) * 10) / 10,
        rangeLearningHours: Math.round((rangeLearningMinutes / 60) * 10) / 10,
        rangeTeachingHours: Math.round((rangeTeachingMinutes / 60) * 10) / 10,
        rangeHours: Math.round(((rangeLearningMinutes + rangeTeachingMinutes) / 60) * 10) / 10,
      },
      achievements: {
        unlockedCount: userAchievements.length,
        totalCount: allAchievements.length,
        percentage: allAchievements.length > 0 ? Math.round((userAchievements.length / allAchievements.length) * 100) : 0,
      },
      goals: {
        inProgressCount: activeGoals.length,
        completedCount: completedGoals.length,
      },
      streak: {
        currentStreak: streak.currentStreak,
        longestStreak: streak.longestStreak,
        lastActiveDate: streak.lastActiveDate,
        isEnabled: streak.isEnabled,
      },
      privacy: {
        showLevel: privacy.showLevel,
        showBadges: privacy.showBadges,
        showStats: privacy.showStats,
        showActivityHeatmap: privacy.showActivityHeatmap,
        showLearningGoals: privacy.showLearningGoals,
      },
    };
  }

  /**
   * Builds an activity heatmap dataset grouped by date (YYYY-MM-DD) for a given year.
   */
  async getActivityHeatmap(userId: number, year: number = new Date().getFullYear(), timezone: string = 'UTC') {
    const dailyCounts: Record<string, number> = {};

    // 1. Completed sessions
    const sessions = await db.orm.public.Session.where({ status: 'COMPLETED' }).all();
    for (const s of sessions) {
      if (s.learnerId === userId || s.teacherId === userId) {
        const dateObj = new Date(s.completedAt || s.createdAt);
        if (dateObj.getFullYear() === year) {
          const dateStr = getDateStringInTimezone(dateObj, timezone);
          dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
        }
      }
    }

    // 2. Completed milestones
    const roadmaps = await db.orm.public.LearningRoadmap.where({ userId }).all();
    for (const rm of roadmaps) {
      const milestones = await db.orm.public.RoadmapMilestone.where({ roadmapId: rm.id, isCompleted: true }).all();
      for (const m of milestones) {
        if (m.completedAt) {
          const mDate = new Date(m.completedAt);
          if (mDate.getFullYear() === year) {
            const dateStr = getDateStringInTimezone(mDate, timezone);
            dailyCounts[dateStr] = (dailyCounts[dateStr] || 0) + 1;
          }
        }
      }
    }

    // Convert into list of days
    let totalContributions = 0;
    const days: Array<{ date: string; count: number; level: number }> = [];

    for (const [date, count] of Object.entries(dailyCounts)) {
      totalContributions += count;
      let level = 1;
      if (count >= 4) level = 4;
      else if (count >= 3) level = 3;
      else if (count >= 2) level = 2;

      days.push({ date, count, level });
    }

    // Sort chronologically
    days.sort((a, b) => a.date.localeCompare(b.date));

    return {
      year,
      timezone,
      totalContributions,
      days,
    };
  }

  /**
   * Aggregates skill-specific learning and teaching progress.
   */
  async getSkillProgress(userId: number) {
    const allSkills = await db.orm.public.Skill.where({ isDisabled: false }).all();
    const skillMap = new Map<number, any>();
    for (const sk of allSkills) {
      skillMap.set(sk.id, sk);
    }

    const sessions = await db.orm.public.Session.where({ status: 'COMPLETED' }).all();

    const skillStats: Record<
      number,
      {
        skillId: number;
        skillName: string;
        category: string;
        sessionsLearned: number;
        hoursLearned: number;
        sessionsTaught: number;
        hoursTaught: number;
        lastPracticed: string | null;
      }
    > = {};

    for (const s of sessions) {
      if (!s.skillId) continue;
      const isLearner = s.learnerId === userId;
      const isTeacher = s.teacherId === userId;

      if (!isLearner && !isTeacher) continue;

      if (!skillStats[s.skillId]) {
        const sk = skillMap.get(s.skillId);
        skillStats[s.skillId] = {
          skillId: s.skillId,
          skillName: sk?.name || `Skill #${s.skillId}`,
          category: sk?.category || 'General',
          sessionsLearned: 0,
          hoursLearned: 0,
          sessionsTaught: 0,
          hoursTaught: 0,
          lastPracticed: null,
        };
      }

      const entry = skillStats[s.skillId]!;
      const sessionDate = s.completedAt || s.createdAt;
      if (!entry.lastPracticed || sessionDate > entry.lastPracticed) {
        entry.lastPracticed = sessionDate;
      }

      const durationHours = (s.duration || 60) / 60;
      if (isLearner) {
        entry.sessionsLearned += 1;
        entry.hoursLearned += Math.round(durationHours * 10) / 10;
      }
      if (isTeacher) {
        entry.sessionsTaught += 1;
        entry.hoursTaught += Math.round(durationHours * 10) / 10;
      }
    }

    return Object.values(skillStats).sort(
      (a, b) => (b.sessionsLearned + b.sessionsTaught) - (a.sessionsLearned + a.sessionsTaught)
    );
  }

  /**
   * Retrieves public profile gamification stats honoring the user's privacy settings.
   */
  async getPublicProfileGamification(username: string) {
    const user = await userRepository.findByUsername(username);
    if (!user) return null;

    const privacy = await gamificationPrivacyRepository.getOrCreatePrivacy(user.id);
    const userXP = await xpRepository.getOrCreateUserXP(user.id);
    const levelInfo = calculateLevelFromXP(userXP.totalXp);
    const userAchievements = await achievementRepository.getAchievementsWithUserStatus(user.id);

    return {
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      level: privacy.showLevel ? {
        currentLevel: levelInfo.level,
        title: levelInfo.title,
        totalXp: userXP.totalXp,
        progressPercent: levelInfo.progressPercent,
      } : null,
      badges: privacy.showBadges ? userAchievements.filter((a) => a.unlocked) : [],
      stats: privacy.showStats ? {
        completedSessions: user.completedSessions || 0,
        averageRating: user.averageRating || 0,
        totalReviews: user.totalReviews || 0,
      } : null,
      privacy: {
        showLevel: privacy.showLevel,
        showBadges: privacy.showBadges,
        showStats: privacy.showStats,
      },
    };
  }
}

export const learningAnalyticsService = new LearningAnalyticsService();

