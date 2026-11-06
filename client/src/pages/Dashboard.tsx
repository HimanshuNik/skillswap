import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Sparkles, Flame, ChevronRight } from "lucide-react";
import AppLayout from "../components/app/AppLayout";
import MatchCard from "../components/matches/MatchCard";
import SessionCard from "../components/sessions/SessionCard";
import { VideoMeetingModal } from "../components/sessions/VideoMeetingModal";
import { useAuthStore } from "../store/useAuthStore";
import { useDashboard } from "../hooks/useDashboard";
import { gamificationApi } from "../lib/gamificationApi";
import type { SessionWithDetails } from "../types/session";

const Dashboard = () => {
  const { user } = useAuthStore();
  const [activeVideoSession, setActiveVideoSession] = useState<SessionWithDetails | null>(null);

  const { data: dashboard, isLoading } = useDashboard();
  const { data: gamification } = useQuery({
    queryKey: ['gamification-me'],
    queryFn: () => gamificationApi.getMe(),
  });

  const summary = dashboard?.summary;
  const recommendations = dashboard?.recommendations ?? [];
  const upcomingSessions = dashboard?.upcomingSessions ?? [];
  const recentActivity = dashboard?.recentActivity ?? [];
  const profileCompletion = dashboard?.profileCompletion;

  // Next session description
  const nextSession = dashboard?.nextSession || upcomingSessions[0];
  let nextSessionDesc = "No upcoming sessions";
  if (nextSession) {
    const sDate = new Date(nextSession.scheduledStart || nextSession.scheduledAt!);
    nextSessionDesc = `Next: ${sDate.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    })} at ${sDate.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }

  const stats = [
    {
      label: "Skill matches",
      value: String(recommendations.length || 0),
      description: "Based on reciprocal skills",
    },
    {
      label: "Upcoming sessions",
      value: String(summary?.upcomingSessionsCount ?? upcomingSessions.length),
      description: nextSessionDesc,
    },
    {
      label: "Active swaps",
      value: String(summary?.activeSwaps ?? 0),
      description: `${summary?.completedSwaps ?? 0} reciprocal swaps completed`,
    },
    {
      label: "Community rating",
      value: summary?.averageRating && summary.averageRating > 0
        ? Number(summary.averageRating).toFixed(1)
        : user?.averageRating
        ? Number(user.averageRating).toFixed(1)
        : "5.0",
      description: `${summary?.totalReviews ?? user?.totalReviews ?? 0} verified reviews`,
    },
  ];

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Welcome Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Dashboard</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Welcome back, {user?.name || "Member"} 👋
            </h1>
            <p className="mt-1 text-slate-500">
              Here's what's happening with your SkillSwap journey.
            </p>
          </div>

          {/* Quick Action Navigation Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/matches"
              className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700"
            >
              Find Matches
            </Link>
            <Link
              to="/discover"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              Explore Users
            </Link>
            <Link
              to="/requests"
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50"
            >
              Swap Requests
              {summary && summary.pendingRequestsCount > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                  {summary.pendingRequestsCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* Profile Completion Encouragement Banner */}
        {profileCompletion && profileCompletion.percentage < 100 && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-emerald-900">
                    Profile Completion: {profileCompletion.percentage}%
                  </span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                    {profileCompletion.percentage >= 70 ? "Almost there!" : "Getting started"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-emerald-800">
                  Complete your profile to unlock higher matching scores and more swap requests.
                </p>
              </div>

              {profileCompletion.missingItems.length > 0 && (
                <Link
                  to={profileCompletion.missingItems[0].actionUrl}
                  className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-800"
                >
                  {profileCompletion.missingItems[0].label} →
                </Link>
              )}
            </div>

            {/* Progress bar */}
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-200">
              <div
                className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                style={{ width: `${profileCompletion.percentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Level Progression & Gamification Banner */}
        {gamification && (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-5 text-white shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-300 border border-emerald-400/30">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    Level {gamification.levelInfo.currentLevel} • {gamification.levelInfo.title}
                  </span>
                  {gamification.streak.isEnabled && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-xs font-bold text-amber-300 border border-amber-400/30">
                      <Flame className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      {gamification.streak.currentStreak} Day Streak
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-200">
                  {gamification.levelInfo.xpRequiredForNextLevel > 0
                    ? `${gamification.levelInfo.xpRequiredForNextLevel} XP until Level ${gamification.levelInfo.currentLevel + 1}`
                    : 'Maximum level achieved!'}
                </p>
              </div>

              <div className="flex items-center gap-4">
                <div className="w-48 sm:w-60">
                  <div className="flex justify-between text-[11px] font-semibold text-emerald-200 mb-1">
                    <span>{gamification.levelInfo.totalXp.toLocaleString()} XP</span>
                    <span>{gamification.levelInfo.nextLevelXp.toLocaleString()} XP</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-black/40 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                      style={{ width: `${Math.min(100, gamification.levelInfo.progressPercent)}%` }}
                    />
                  </div>
                </div>

                <Link
                  to="/learning-analytics"
                  className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-white/10 hover:bg-white/20 px-3.5 py-2 text-xs font-bold text-white transition backdrop-blur-xs border border-white/15"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  Analytics
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <section className="mt-8">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white p-5"
                  />
                ))
              : stats.map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                  >
                    <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                    <p className="mt-3 text-3xl font-bold text-slate-950">{stat.value}</p>
                    <p className="mt-2 text-xs text-slate-500">{stat.description}</p>
                  </div>
                ))}
          </div>
        </section>

        {/* Main Grid: Left Column (Matches & Sessions), Right Column (Recent Activity) */}
        <div className="mt-10 grid gap-8 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {/* Recommended Matches Section */}
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Recommended matches
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    People whose skills match what you want to learn.
                  </p>
                </div>

                <Link
                  to="/matches"
                  className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  View all →
                </Link>
              </div>

              <div className="mt-6">
                {isLoading ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white"
                      />
                    ))}
                  </div>
                ) : recommendations.length > 0 ? (
                  <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                    {recommendations.slice(0, 3).map((match) => {
                      const initials = match.user.name
                        ? match.user.name
                            .split(" ")
                            .map((p) => p.charAt(0))
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)
                        : "??";

                      return (
                        <MatchCard
                          key={match.userId}
                          username={match.user.username}
                          name={match.user.name}
                          initials={initials}
                          teaches={match.theyCanTeachYou[0] || "Skills"}
                          wantsToLearn={match.youCanTeachThem[0] || "Skills"}
                          matchPercentage={match.compatibilityScore}
                          rating={Number((match.user.averageRating || 5.0).toFixed(1))}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      No matching partners found yet
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Add more skills you can teach and want to learn to get discovered by peers.
                    </p>
                    <Link
                      to="/settings"
                      className="mt-4 inline-block rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Update My Skills
                    </Link>
                  </div>
                )}
              </div>
            </section>

            {/* Upcoming Sessions Section */}
            <section>
              <div className="flex items-end justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">
                    Upcoming sessions
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Your scheduled SkillSwap reciprocal sessions.
                  </p>
                </div>

                <Link
                  to="/sessions"
                  className="text-sm font-semibold text-emerald-600 transition hover:text-emerald-700"
                >
                  View all sessions →
                </Link>
              </div>

              <div className="mt-6 space-y-4">
                {isLoading ? (
                  <div className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white" />
                ) : upcomingSessions.length > 0 ? (
                  upcomingSessions.slice(0, 3).map((session) => (
                    <SessionCard
                      key={session.id}
                      session={session}
                      currentUserId={user?.id}
                      onJoinMeeting={(s) => setActiveVideoSession(s)}
                    />
                  ))
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
                    <p className="text-base font-semibold text-slate-900">
                      No upcoming sessions scheduled
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Connect with peers and schedule teaching and learning exchanges.
                    </p>
                    <Link
                      to="/sessions"
                      className="mt-4 inline-block rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Schedule a Session
                    </Link>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right Column: Recent Activity Feed */}
          <div>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-950">Recent Activity</h2>
                <span className="text-xs font-semibold text-slate-400">Live feed</span>
              </div>

              <div className="mt-6 space-y-4">
                {isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
                  ))
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((activity) => {
                    const date = new Date(activity.timestamp);
                    const formattedDate = date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    });

                    return (
                      <Link
                        key={activity.id}
                        to={activity.link}
                        className="group flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-slate-50"
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                          {activity.type === "SWAP_REQUEST" && "🤝"}
                          {activity.type === "SESSION" && "📅"}
                          {activity.type === "REVIEW" && "★"}
                          {activity.type === "NOTIFICATION" && "🔔"}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-slate-900 group-hover:text-emerald-600 transition">
                            {activity.title}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {activity.description}
                          </p>
                          <p className="mt-1 text-[10px] text-slate-400">
                            {formattedDate}
                          </p>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <p className="py-6 text-center text-xs italic text-slate-400">
                    No recent activity yet. Your swap requests, sessions, and reviews will appear here.
                  </p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>

      <VideoMeetingModal
        isOpen={!!activeVideoSession}
        onClose={() => setActiveVideoSession(null)}
        session={activeVideoSession}
      />
    </AppLayout>
  );
};

export default Dashboard;
