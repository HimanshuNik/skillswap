import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy,
  Award,
  Zap,
  Flame,
  Target,
  BookOpen,
  Calendar,
  Clock,
  Sparkles,
  Lock,
  Plus,
  Trash2,
  CheckCircle2,
  Shield,
  Star,
  Compass,
  Handshake,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';
import AppLayout from '../components/app/AppLayout';
import {
  gamificationApi,
  type LearningAnalyticsOverview,
  type AchievementItem,
  type ActivityHeatmapResponse,
  type SkillProgressItem,
  type LearningGoalItem,
  type CreateGoalPayload,
  type GamificationPrivacySettings,
} from '../lib/gamificationApi';

export const LearningAnalytics = () => {
  const queryClient = useQueryClient();

  // Filters & State
  const [range, setRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [achievementFilter, setAchievementFilter] = useState<'ALL' | 'LEARNING' | 'TEACHING' | 'COMMUNITY' | 'ROADMAP'>('ALL');
  const [goalStatusFilter, setGoalStatusFilter] = useState<'ALL' | 'IN_PROGRESS' | 'COMPLETED'>('ALL');

  // Modals state
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [isPrivacyModalOpen, setIsPrivacyModalOpen] = useState(false);

  // New goal form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalType, setNewGoalType] = useState<'SESSIONS_COUNT' | 'HOURS_COUNT' | 'ROADMAP_MILESTONES' | 'CUSTOM'>('SESSIONS_COUNT');
  const [newGoalTarget, setNewGoalTarget] = useState(3);
  const [newGoalUnit, setNewGoalUnit] = useState('sessions');
  const [newGoalSkillName, setNewGoalSkillName] = useState('');
  const [newGoalDeadline, setNewGoalDeadline] = useState('');

  // 1. Overview Query
  const { data: overview, isLoading: isOverviewLoading } = useQuery<LearningAnalyticsOverview>({
    queryKey: ['learning-analytics-overview', range],
    queryFn: () => gamificationApi.getOverview(range),
  });

  // 2. Achievements Query
  const { data: achievements = [], isLoading: isAchievementsLoading } = useQuery<AchievementItem[]>({
    queryKey: ['gamification-achievements'],
    queryFn: () => gamificationApi.getAchievements(),
  });

  // 3. Heatmap Query
  const { data: heatmap } = useQuery<ActivityHeatmapResponse>({
    queryKey: ['learning-activity-heatmap', selectedYear],
    queryFn: () => gamificationApi.getActivityHeatmap(selectedYear),
  });

  // 4. Skills Progress Query
  const { data: skillProgress = [] } = useQuery<SkillProgressItem[]>({
    queryKey: ['learning-skills-progress'],
    queryFn: () => gamificationApi.getSkillProgress(),
  });

  // 5. Goals Query
  const { data: goals = [] } = useQuery<LearningGoalItem[]>({
    queryKey: ['learning-goals'],
    queryFn: () => gamificationApi.getGoals(),
  });

  // Mutations
  const toggleStreakMutation = useMutation({
    mutationFn: (isEnabled: boolean) => gamificationApi.toggleStreak(isEnabled),
    onSuccess: (updated) => {
      toast.success(updated.isEnabled ? 'Learning streak tracking enabled' : 'Streak tracking paused');
      queryClient.invalidateQueries({ queryKey: ['learning-analytics-overview'] });
    },
    onError: () => toast.error('Failed to update streak settings'),
  });

  const featureBadgeMutation = useMutation({
    mutationFn: ({ code, isFeatured }: { code: string; isFeatured: boolean }) =>
      gamificationApi.toggleFeatureBadge(code, isFeatured),
    onSuccess: () => {
      toast.success('Badge featured status updated');
      queryClient.invalidateQueries({ queryKey: ['gamification-achievements'] });
    },
    onError: () => toast.error('Failed to update featured badge'),
  });

  const createGoalMutation = useMutation({
    mutationFn: (payload: CreateGoalPayload) => gamificationApi.createGoal(payload),
    onSuccess: () => {
      toast.success('Learning goal created! 🎯');
      setIsGoalModalOpen(false);
      setNewGoalTitle('');
      setNewGoalTarget(3);
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      queryClient.invalidateQueries({ queryKey: ['learning-analytics-overview'] });
    },
    onError: () => toast.error('Failed to create learning goal'),
  });

  const completeGoalMutation = useMutation({
    mutationFn: (goal: LearningGoalItem) =>
      gamificationApi.updateGoal(goal.id, {
        status: 'COMPLETED',
        currentValue: goal.targetValue,
      }),
    onSuccess: () => {
      toast.success('Goal completed! +50 XP awarded! 🎉');
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      queryClient.invalidateQueries({ queryKey: ['learning-analytics-overview'] });
      queryClient.invalidateQueries({ queryKey: ['gamification-achievements'] });
    },
    onError: () => toast.error('Failed to update goal'),
  });

  const deleteGoalMutation = useMutation({
    mutationFn: (id: number) => gamificationApi.deleteGoal(id),
    onSuccess: () => {
      toast.success('Learning goal removed');
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
    },
    onError: () => toast.error('Failed to remove goal'),
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: (settings: Partial<GamificationPrivacySettings>) => gamificationApi.updatePrivacy(settings),
    onSuccess: () => {
      toast.success('Privacy settings saved');
      setIsPrivacyModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['learning-analytics-overview'] });
    },
    onError: () => toast.error('Failed to update privacy settings'),
  });

  // Filtered lists
  const filteredAchievements = achievements.filter((a) => {
    if (achievementFilter === 'ALL') return true;
    return a.category === achievementFilter;
  });

  const filteredGoals = goals.filter((g) => {
    if (goalStatusFilter === 'ALL') return true;
    return g.status === goalStatusFilter;
  });

  // Badges helper
  const renderBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Handshake': return <Handshake className="w-6 h-6" />;
      case 'BookOpen': return <BookOpen className="w-6 h-6" />;
      case 'Award': return <Award className="w-6 h-6" />;
      case 'Compass': return <Compass className="w-6 h-6" />;
      case 'Flame': return <Flame className="w-6 h-6" />;
      case 'Trophy': return <Trophy className="w-6 h-6" />;
      case 'Milestone': return <Sparkles className="w-6 h-6" />;
      case 'Star': return <Star className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Target': return <Target className="w-6 h-6" />;
      default: return <Award className="w-6 h-6" />;
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl space-y-8 pb-12">
        {/* Top Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Gamification & Analytics
              </span>
              {overview?.streak.isEnabled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  <Flame className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                  {overview.streak.currentStreak} Day Streak
                </span>
              )}
            </div>
            <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-slate-900">
              Personal Learning Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Track your skill development, verified exchange hours, experience points, and milestone badges.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsPrivacyModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition"
            >
              <Shield className="w-4 h-4 text-slate-500" />
              Privacy Controls
            </button>
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              New Learning Goal
            </button>
          </div>
        </div>

        {/* Level Progression Hero Card */}
        {overview && (
          <div className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-600 via-teal-700 to-slate-900 p-6 sm:p-8 text-white shadow-lg">
            <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-bold tracking-wide backdrop-blur-md">
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  LEVEL {overview.levelInfo.currentLevel}
                </div>
                <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
                  {overview.levelInfo.title}
                </h2>
                <p className="text-sm text-emerald-100 max-w-xl">
                  {overview.levelInfo.xpRequiredForNextLevel > 0
                    ? `${overview.levelInfo.xpRequiredForNextLevel} XP needed to reach Level ${overview.levelInfo.currentLevel + 1}`
                    : 'Maximum level threshold achieved! Keep mastering new skills.'}
                </p>
              </div>

              {/* XP Progression Bar */}
              <div className="w-full lg:max-w-md rounded-2xl bg-white/10 p-5 backdrop-blur-md border border-white/15">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-100 mb-2">
                  <span>Current XP: {overview.levelInfo.totalXp.toLocaleString()}</span>
                  <span>Next: {overview.levelInfo.nextLevelXp.toLocaleString()} XP</span>
                </div>
                <div className="h-3 w-full rounded-full bg-black/30 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-300 transition-all duration-500"
                    style={{ width: `${Math.min(100, overview.levelInfo.progressPercent)}%` }}
                  />
                </div>
                <div className="mt-2.5 flex items-center justify-between text-[11px] text-emerald-200">
                  <span>{overview.levelInfo.progressPercent}% of level progress</span>
                  <span>+{overview.xp.earnedInRange} XP in current window</span>
                </div>
              </div>
            </div>

            {/* Quick XP Earning Rules Banner */}
            <div className="mt-6 pt-5 border-t border-white/10 grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              <div className="rounded-xl bg-white/5 p-2">
                <span className="block text-xs font-bold text-amber-300">+40 XP</span>
                <span className="text-[10px] text-emerald-100">Verified Session</span>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <span className="block text-xs font-bold text-amber-300">+100 XP</span>
                <span className="text-[10px] text-emerald-100">First Swap</span>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <span className="block text-xs font-bold text-amber-300">+50 XP</span>
                <span className="text-[10px] text-emerald-100">Complete Goal</span>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <span className="block text-xs font-bold text-amber-300">+15 XP</span>
                <span className="text-[10px] text-emerald-100">Roadmap Milestone</span>
              </div>
              <div className="rounded-xl bg-white/5 p-2">
                <span className="block text-xs font-bold text-amber-300">+10 XP</span>
                <span className="text-[10px] text-emerald-100">Verified Review</span>
              </div>
            </div>
          </div>
        )}

        {/* Time Window Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-100 p-1">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold capitalize transition ${
                  range === r
                    ? 'bg-white text-emerald-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {r === 'all' ? 'All Time' : `${r.toUpperCase()} Window`}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Clock className="w-3.5 h-3.5" />
            Showing metrics for: <span className="font-bold text-slate-800">{range.toUpperCase()}</span>
          </div>
        </div>

        {/* Metric KPI Cards */}
        {isOverviewLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-2xl bg-slate-100" />
            ))}
          </div>
        ) : overview && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Verified Learning Hours */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Learning Time</span>
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                  <BookOpen className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {overview.hours.rangeLearningHours} <span className="text-sm font-semibold text-slate-500">hrs</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overview.sessions.rangeLearningSessions} learning sessions verified
              </p>
            </div>

            {/* Total Verified Teaching Hours */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Teaching Time</span>
                <div className="rounded-xl bg-teal-50 p-2 text-teal-600">
                  <Award className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {overview.hours.rangeTeachingHours} <span className="text-sm font-semibold text-slate-500">hrs</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overview.sessions.rangeTeachingSessions} peer coaching sessions delivered
              </p>
            </div>

            {/* Total Completed Swaps & Sessions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sessions</span>
                <div className="rounded-xl bg-blue-50 p-2 text-blue-600">
                  <Handshake className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {overview.sessions.rangeCompleted} <span className="text-sm font-semibold text-slate-500">sessions</span>
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Lifetime: {overview.sessions.totalCompleted} completed
              </p>
            </div>

            {/* Badges Unlocked */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Achievements</span>
                <div className="rounded-xl bg-amber-50 p-2 text-amber-600">
                  <Trophy className="w-5 h-5" />
                </div>
              </div>
              <p className="mt-3 text-2xl font-black text-slate-900">
                {overview.achievements.unlockedCount} / {overview.achievements.totalCount}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {overview.achievements.percentage}% catalog unlocked
              </p>
            </div>
          </div>
        )}

        {/* GitHub-style Activity Heatmap Section */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                <h3 className="text-lg font-bold text-slate-900">Learning Activity Heatmap</h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Verified swap sessions and completed roadmap milestones over time.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-600">
                {heatmap?.totalContributions || 0} activities in {selectedYear}
              </span>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-xs"
              >
                {[2026, 2025].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Activity Heatmap Grid */}
          <div className="overflow-x-auto pt-2 pb-2">
            <div className="min-w-[700px] flex gap-1.5">
              {heatmap?.days && heatmap.days.length > 0 ? (
                <div className="grid grid-flow-col grid-rows-7 gap-1.5">
                  {heatmap.days.map((d) => {
                    let bg = 'bg-slate-100 hover:bg-slate-200';
                    if (d.level === 1) bg = 'bg-emerald-200 hover:bg-emerald-300';
                    if (d.level === 2) bg = 'bg-emerald-400 hover:bg-emerald-500';
                    if (d.level === 3) bg = 'bg-emerald-600 hover:bg-emerald-700';
                    if (d.level >= 4) bg = 'bg-emerald-800 hover:bg-emerald-900';

                    return (
                      <div
                        key={d.date}
                        title={`${d.count} verified activities on ${d.date}`}
                        className={`w-3.5 h-3.5 rounded-xs transition-colors cursor-pointer ${bg}`}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="py-8 text-center w-full text-xs text-slate-400 font-medium">
                  No verified session activity recorded for {selectedYear} yet.
                </div>
              )}
            </div>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            <span>Timezone: {heatmap?.timezone || 'UTC'}</span>
            <div className="flex items-center gap-1.5">
              <span>Less</span>
              <div className="w-3 h-3 rounded-xs bg-slate-100" />
              <div className="w-3 h-3 rounded-xs bg-emerald-200" />
              <div className="w-3 h-3 rounded-xs bg-emerald-400" />
              <div className="w-3 h-3 rounded-xs bg-emerald-600" />
              <div className="w-3 h-3 rounded-xs bg-emerald-800" />
              <span>More</span>
            </div>
          </div>
        </div>

        {/* 2-Column: Personal Learning Goals & Skill Progress Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Column A: Personal Learning Goals */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-emerald-600" />
                  Learning Goals
                </h3>
                <p className="text-xs text-slate-500">Auto-tracks progress from verified sessions</p>
              </div>

              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
                {(['ALL', 'IN_PROGRESS', 'COMPLETED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setGoalStatusFilter(s)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-bold capitalize transition ${
                      goalStatusFilter === s
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {s === 'ALL' ? 'All' : s === 'IN_PROGRESS' ? 'Active' : 'Done'}
                  </button>
                ))}
              </div>
            </div>

            {filteredGoals.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200">
                <Target className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No goals found</p>
                <p className="text-xs text-slate-400 mt-1">Set a goal to earn +50 XP upon completion!</p>
                <button
                  onClick={() => setIsGoalModalOpen(true)}
                  className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Goal
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGoals.map((g) => {
                  const percent = Math.min(100, Math.round((g.currentValue / g.targetValue) * 100));
                  return (
                    <div
                      key={g.id}
                      className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4 space-y-3 hover:border-slate-200 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`inline-block text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                            g.status === 'COMPLETED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {g.status === 'COMPLETED' ? 'Completed' : 'In Progress'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm mt-1">{g.title}</h4>
                          {g.skillName && (
                            <span className="text-xs text-slate-500 font-medium">Skill: {g.skillName}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          {g.status !== 'COMPLETED' && (
                            <button
                              onClick={() => completeGoalMutation.mutate(g)}
                              title="Mark as completed"
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteGoalMutation.mutate(g.id)}
                            title="Delete goal"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress */}
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1">
                          <span>{g.currentValue} / {g.targetValue} {g.unit}</span>
                          <span>{percent}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              g.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Column B: Skill Progress Breakdown */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
                Verified Skill Development
              </h3>
              <p className="text-xs text-slate-500">Breakdown of practice hours across individual skills</p>
            </div>

            {skillProgress.length === 0 ? (
              <div className="py-12 text-center rounded-2xl border border-dashed border-slate-200">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No skill sessions logged yet</p>
                <p className="text-xs text-slate-400 mt-1">Complete your first verified skill swap to see your progress here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {skillProgress.map((sk) => (
                  <div
                    key={sk.skillId}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs hover:border-slate-200 transition"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{sk.skillName}</h4>
                        <span className="text-[11px] text-slate-400 font-semibold">{sk.category}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                        {Math.round((sk.hoursLearned + sk.hoursTaught) * 10) / 10} hrs total
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 text-slate-600">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Learned:</span>
                        <span className="font-semibold">{sk.sessionsLearned} sessions ({sk.hoursLearned} hrs)</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Taught:</span>
                        <span className="font-semibold">{sk.sessionsTaught} sessions ({sk.hoursTaught} hrs)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Achievement Badges Showcase */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h3 className="text-xl font-bold text-slate-900">Achievement Badges Showcase</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Unlock badges by completing verified platform milestones. Star a badge to feature it on your public profile!
              </p>
            </div>

            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl bg-slate-100 p-1">
              {(['ALL', 'LEARNING', 'TEACHING', 'COMMUNITY', 'ROADMAP'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setAchievementFilter(c)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold capitalize transition ${
                    achievementFilter === c
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {c.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Badges Grid */}
          {isAchievementsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 animate-pulse">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="h-44 rounded-2xl bg-slate-100" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAchievements.map((ach) => (
                <div
                  key={ach.code}
                  className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all ${
                    ach.unlocked
                      ? 'border-emerald-200 bg-gradient-to-b from-emerald-50/60 to-white shadow-xs hover:border-emerald-300'
                      : 'border-slate-200 bg-slate-50/60 opacity-60'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div
                        className={`rounded-2xl p-3 ${
                          ach.unlocked
                            ? 'bg-emerald-600 text-white shadow-xs'
                            : 'bg-slate-200 text-slate-400'
                        }`}
                      >
                        {renderBadgeIcon(ach.badgeIcon)}
                      </div>

                      {ach.unlocked ? (
                        <button
                          onClick={() =>
                            featureBadgeMutation.mutate({
                              code: ach.code,
                              isFeatured: !ach.isFeatured,
                            })
                          }
                          title={ach.isFeatured ? 'Featured on Profile' : 'Click to feature on Profile'}
                          className={`p-1.5 rounded-lg transition ${
                            ach.isFeatured
                              ? 'text-amber-500 bg-amber-50'
                              : 'text-slate-300 hover:text-amber-500 hover:bg-slate-100'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${ach.isFeatured ? 'fill-amber-400' : ''}`} />
                        </button>
                      ) : (
                        <span className="text-slate-400">
                          <Lock className="w-4 h-4" />
                        </span>
                      )}
                    </div>

                    <h4 className="mt-4 font-bold text-slate-900 text-sm">{ach.title}</h4>
                    <p className="mt-1 text-xs text-slate-500 leading-relaxed">{ach.description}</p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-700">+{ach.xpReward} XP</span>
                    {ach.unlocked ? (
                      <span className="text-emerald-600 font-semibold">
                        Unlocked
                      </span>
                    ) : (
                      <span className="text-slate-400 font-medium">
                        Target: {ach.criteriaThreshold}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal: Create Goal */}
        {isGoalModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900">Create Personal Learning Goal</h3>
              <p className="text-xs text-slate-500">
                Goals auto-track as you complete reciprocal sessions and roadmaps.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Title</label>
                  <input
                    type="text"
                    value={newGoalTitle}
                    onChange={(e) => setNewGoalTitle(e.target.value)}
                    placeholder="e.g. Complete 5 React Sessions"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Goal Type</label>
                  <select
                    value={newGoalType}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewGoalType(e.target.value as NonNullable<CreateGoalPayload['goalType']>)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  >
                    <option value="SESSIONS_COUNT">Completed Sessions Count</option>
                    <option value="HOURS_COUNT">Verified Learning Hours</option>
                    <option value="ROADMAP_MILESTONES">Roadmap Milestones</option>
                    <option value="CUSTOM">Custom Project Task</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Target Value</label>
                    <input
                      type="number"
                      min="1"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(Number(e.target.value))}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Unit</label>
                    <input
                      type="text"
                      value={newGoalUnit}
                      onChange={(e) => setNewGoalUnit(e.target.value)}
                      placeholder="sessions"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Specific Skill (Optional)</label>
                  <input
                    type="text"
                    value={newGoalSkillName}
                    onChange={(e) => setNewGoalSkillName(e.target.value)}
                    placeholder="e.g. React or UI/UX Design"
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Target Deadline (Optional)</label>
                  <input
                    type="datetime-local"
                    value={newGoalDeadline}
                    onChange={(e) => setNewGoalDeadline(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsGoalModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  disabled={!newGoalTitle.trim()}
                  onClick={() =>
                    createGoalMutation.mutate({
                      title: newGoalTitle.trim(),
                      goalType: newGoalType,
                      targetValue: newGoalTarget,
                      unit: newGoalUnit,
                      skillName: newGoalSkillName ? newGoalSkillName.trim() : undefined,
                      deadline: newGoalDeadline ? new Date(newGoalDeadline).toISOString() : null,
                    })
                  }
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Create (+50 XP when done)
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Privacy Controls */}
        {isPrivacyModalOpen && overview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-5 h-5 text-emerald-600" />
                Gamification Privacy Settings
              </h3>
              <p className="text-xs text-slate-500">
                Configure what other community members can see on your public profile.
              </p>

              <div className="space-y-3 pt-2">
                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Show Level & XP</span>
                    <span className="text-[11px] text-slate-500">Displays your current Level badge on profile</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={overview.privacy.showLevel}
                    id="priv-showLevel"
                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Show Achievement Badges</span>
                    <span className="text-[11px] text-slate-500">Displays your unlocked trophy badges</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={overview.privacy.showBadges}
                    id="priv-showBadges"
                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Show Session Statistics</span>
                    <span className="text-[11px] text-slate-500">Displays verified teaching & learning hours</span>
                  </div>
                  <input
                    type="checkbox"
                    defaultChecked={overview.privacy.showStats}
                    id="priv-showStats"
                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer">
                  <div>
                    <span className="block text-xs font-bold text-slate-900">Enable Daily Streak Tracking</span>
                    <span className="text-[11px] text-slate-500">Active streaks with daily activity check</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={overview.streak.isEnabled}
                    onChange={(e) => toggleStreakMutation.mutate(e.target.checked)}
                    className="h-4 w-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setIsPrivacyModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const showLevel = (document.getElementById('priv-showLevel') as HTMLInputElement)?.checked;
                    const showBadges = (document.getElementById('priv-showBadges') as HTMLInputElement)?.checked;
                    const showStats = (document.getElementById('priv-showStats') as HTMLInputElement)?.checked;
                    updatePrivacyMutation.mutate({ showLevel, showBadges, showStats });
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  Save Privacy
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default LearningAnalytics;
