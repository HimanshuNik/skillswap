import { apiFetch } from './api';

export interface LevelInfo {
  currentLevel: number;
  title: string;
  totalXp: number;
  currentLevelXp: number;
  nextLevelXp: number;
  xpInCurrentLevel: number;
  xpRequiredForNextLevel: number;
  progressPercent: number;
}

export interface AchievementItem {
  id: number;
  code: string;
  title: string;
  description: string;
  category: string;
  badgeIcon: string;
  xpReward: number;
  criteriaType: string;
  criteriaThreshold: number;
  unlocked: boolean;
  unlockedAt: string | null;
  isFeatured: boolean;
}

export interface XPTransactionItem {
  id: number;
  userId: number;
  amount: number;
  actionType: string;
  idempotencyKey: string;
  description: string;
  metadata: string | null;
  createdAt: string;
}

export interface UserStreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActiveDate: string | null;
  isEnabled: boolean;
}

export interface GamificationPrivacySettings {
  showLevel: boolean;
  showBadges: boolean;
  showStats: boolean;
  showActivityHeatmap: boolean;
  showLearningGoals: boolean;
}

export interface LearningAnalyticsOverview {
  rangeDays: number;
  levelInfo: LevelInfo;
  xp: {
    totalXp: number;
    earnedInRange: number;
  };
  sessions: {
    totalCompleted: number;
    totalLearningSessions: number;
    totalTeachingSessions: number;
    rangeCompleted: number;
    rangeLearningSessions: number;
    rangeTeachingSessions: number;
  };
  hours: {
    totalLearningHours: number;
    totalTeachingHours: number;
    totalHours: number;
    rangeLearningHours: number;
    rangeTeachingHours: number;
    rangeHours: number;
  };
  achievements: {
    unlockedCount: number;
    totalCount: number;
    percentage: number;
  };
  goals: {
    inProgressCount: number;
    completedCount: number;
  };
  streak: UserStreakInfo;
  privacy: GamificationPrivacySettings;
}

export interface ActivityHeatmapDay {
  date: string;
  count: number;
  level: number; // 0 = none, 1-4 = activity intensity
}

export interface ActivityHeatmapResponse {
  year: number;
  timezone: string;
  totalContributions: number;
  days: ActivityHeatmapDay[];
}

export interface SkillProgressItem {
  skillId: number;
  skillName: string;
  category: string;
  sessionsLearned: number;
  hoursLearned: number;
  sessionsTaught: number;
  hoursTaught: number;
  lastPracticed: string | null;
}

export interface LearningGoalItem {
  id: number;
  userId: number;
  title: string;
  description: string | null;
  skillId: number | null;
  skillName: string | null;
  goalType: string;
  targetValue: number;
  currentValue: number;
  unit: string;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  deadline: string | null;
  completedAt: string | null;
  isAutomated: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGoalPayload {
  title: string;
  description?: string;
  skillId?: number | null;
  skillName?: string;
  goalType?: 'SESSIONS_COUNT' | 'HOURS_COUNT' | 'ROADMAP_MILESTONES' | 'CUSTOM';
  targetValue: number;
  unit?: string;
  deadline?: string | null;
  isAutomated?: boolean;
}

export interface UpdateGoalPayload {
  title?: string;
  description?: string | null;
  targetValue?: number;
  currentValue?: number;
  unit?: string;
  status?: 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  deadline?: string | null;
}

export interface PublicGamificationProfile {
  username: string;
  name: string;
  avatarUrl: string | null;
  level: {
    currentLevel: number;
    title: string;
    totalXp: number;
    progressPercent: number;
  } | null;
  badges: AchievementItem[];
  stats: {
    completedSessions: number;
    averageRating: number;
    totalReviews: number;
  } | null;
  privacy: {
    showLevel: boolean;
    showBadges: boolean;
    showStats: boolean;
  };
}

export const gamificationApi = {
  async getMe(): Promise<{
    levelInfo: LevelInfo;
    streak: UserStreakInfo;
    achievements: { unlockedCount: number; totalCount: number };
    privacy: GamificationPrivacySettings;
  }> {
    const res = await apiFetch<{
      success: boolean;
      data: {
        levelInfo: LevelInfo;
        streak: UserStreakInfo;
        achievements: { unlockedCount: number; totalCount: number };
        privacy: GamificationPrivacySettings;
      };
    }>('/api/gamification/me');
    return res.data;
  },

  async getAchievements(): Promise<AchievementItem[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { achievements: AchievementItem[] };
    }>('/api/gamification/achievements');
    return res.data.achievements;
  },

  async toggleFeatureBadge(code: string, isFeatured: boolean): Promise<void> {
    await apiFetch(`/api/gamification/achievements/${code}/feature`, {
      method: 'PATCH',
      body: JSON.stringify({ isFeatured }),
    });
  },

  async getHistory(limit: number = 20, offset: number = 0): Promise<{ transactions: XPTransactionItem[]; total: number }> {
    const res = await apiFetch<{
      success: boolean;
      data: { transactions: XPTransactionItem[]; total: number };
    }>(`/api/gamification/history?limit=${limit}&offset=${offset}`);
    return res.data;
  },

  async updatePrivacy(settings: Partial<GamificationPrivacySettings>): Promise<GamificationPrivacySettings> {
    const res = await apiFetch<{
      success: boolean;
      data: { privacy: GamificationPrivacySettings };
    }>('/api/gamification/privacy', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
    return res.data.privacy;
  },

  async toggleStreak(isEnabled: boolean): Promise<UserStreakInfo> {
    const res = await apiFetch<{
      success: boolean;
      data: { streak: UserStreakInfo };
    }>('/api/gamification/streak/toggle', {
      method: 'POST',
      body: JSON.stringify({ isEnabled }),
    });
    return res.data.streak;
  },

  async getPublicProfile(username: string): Promise<PublicGamificationProfile> {
    const res = await apiFetch<{
      success: boolean;
      data: PublicGamificationProfile;
    }>(`/api/gamification/users/${username}`);
    return res.data;
  },

  async getOverview(range: '7d' | '30d' | '90d' | 'all' = '30d'): Promise<LearningAnalyticsOverview> {
    const res = await apiFetch<{
      success: boolean;
      data: LearningAnalyticsOverview;
    }>(`/api/learning-analytics/overview?range=${range}`);
    return res.data;
  },

  async getActivityHeatmap(year?: number, timezone?: string): Promise<ActivityHeatmapResponse> {
    const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    const yr = year || new Date().getFullYear();
    const res = await apiFetch<{
      success: boolean;
      data: ActivityHeatmapResponse;
    }>(`/api/learning-analytics/activity?year=${yr}&timezone=${encodeURIComponent(tz)}`);
    return res.data;
  },

  async getSkillProgress(): Promise<SkillProgressItem[]> {
    const res = await apiFetch<{
      success: boolean;
      data: { skills: SkillProgressItem[] };
    }>('/api/learning-analytics/skills');
    return res.data.skills;
  },

  async getGoals(status?: string): Promise<LearningGoalItem[]> {
    const query = status ? `?status=${status}` : '';
    const res = await apiFetch<{
      success: boolean;
      data: { goals: LearningGoalItem[] };
    }>(`/api/learning-goals${query}`);
    return res.data.goals;
  },

  async createGoal(payload: CreateGoalPayload): Promise<LearningGoalItem> {
    const res = await apiFetch<{
      success: boolean;
      data: { goal: LearningGoalItem };
    }>('/api/learning-goals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.goal;
  },

  async updateGoal(id: number, payload: UpdateGoalPayload): Promise<LearningGoalItem> {
    const res = await apiFetch<{
      success: boolean;
      data: { goal: LearningGoalItem };
    }>(`/api/learning-goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return res.data.goal;
  },

  async deleteGoal(id: number): Promise<void> {
    await apiFetch(`/api/learning-goals/${id}`, {
      method: 'DELETE',
    });
  },
};
