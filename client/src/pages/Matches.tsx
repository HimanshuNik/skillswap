import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AppLayout from "../components/app/AppLayout";
import SkillMatchCard from "../components/matches/SkillMatchCard";
import { useMatches } from "../hooks/useMatches";
import { useAuthStore } from "../store/useAuthStore";
import { CardSkeleton } from "../components/ui/LoadingSkeleton";
import { EmptyState } from "../components/ui/EmptyState";
import { ErrorState } from "../components/ui/ErrorState";
import { aiApi, type RecommendationFeedbackType } from "../lib/aiApi";
import { Sparkles, ThumbsUp, EyeOff, Star, Calendar, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Matches = () => {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useMatches();

  const [activeTab, setActiveTab] = useState<"standard" | "ai">("ai");
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, RecommendationFeedbackType>>({});

  const matches = data?.matches ?? [];
  const totalCount = data?.total ?? 0;

  const { data: aiRecsData, isLoading: isAiLoading } = useQuery({
    queryKey: ['ai-recommendations'],
    queryFn: async () => {
      const res = await aiApi.getRecommendations(1, 20);
      return res.data || [];
    },
    enabled: activeTab === 'ai',
  });

  const [suppressedIds, setSuppressedIds] = useState<number[]>([]);
  const aiRecommendations = (aiRecsData || []).filter((r) => !suppressedIds.includes(r.userId));

  const handleFeedback = async (recommendedUserId: number, type: RecommendationFeedbackType) => {
    try {
      await aiApi.submitRecommendationFeedback(recommendedUserId, type);
      setFeedbackGiven((prev) => ({ ...prev, [recommendedUserId]: type }));

      if (type === "NOT_INTERESTED" || type === "NOT_RELEVANT") {
        toast.info("Thank you for your feedback! This user will not be recommended again.");
        setSuppressedIds((prev) => [...prev, recommendedUserId]);
        queryClient.invalidateQueries({ queryKey: ['ai-recommendations'] });
      } else {
        toast.success("Feedback recorded: Helpful match!");
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : "Failed to submit feedback";
      toast.error(errMsg);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Matches & Discovery</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Your skill matches
            </h1>

            <p className="mt-2 max-w-2xl text-slate-500">
              Discover people whose learning goals complement the skills you can
              teach. Matches are ranked by strict skill reciprocity, mutual availability,
              and community reputation.
            </p>
          </div>

          {/* Tab Selector */}
          <div className="inline-flex rounded-2xl bg-slate-100 p-1.5 self-start sm:self-auto border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab("ai")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "ai"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
              AI Recommendations
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("standard")}
              className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
                activeTab === "standard"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-950"
              }`}
            >
              Standard Matches ({totalCount})
            </button>
          </div>
        </div>

        {/* User not onboarded warning */}
        {user && !user.isOnboarded && (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-6" role="alert">
            <h3 className="font-bold text-amber-900">
              Complete your profile to get matches
            </h3>
            <p className="mt-1 text-sm text-amber-700">
              You haven't completed onboarding yet. Add the skills you can teach,
              skills you want to learn, and your weekly availability to unlock
              smart matches!
            </p>
            <Link
              to="/onboarding"
              className="mt-4 inline-block rounded-xl bg-amber-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-950 focus-visible:ring-2 focus-visible:ring-amber-500"
            >
              Complete Onboarding
            </Link>
          </div>
        )}

        {/* ================= AI RECOMMENDATIONS TAB ================= */}
        {activeTab === "ai" && (
          <div className="mt-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <h2 className="font-bold text-slate-950 text-base">
                  AI-Assisted Reciprocal Matches
                </h2>
              </div>
              <p className="text-xs text-slate-500">
                {aiRecommendations.length} {aiRecommendations.length === 1 ? "recommendation" : "recommendations"}
              </p>
            </div>

            {isAiLoading && (
              <div className="grid gap-5 lg:grid-cols-2">
                <CardSkeleton count={4} />
              </div>
            )}

            {!isAiLoading && aiRecommendations.length === 0 && (
              <EmptyState
                title="No AI recommendations at this moment"
                description="We ensure every recommendation has 100% two-way skill reciprocity. When members offering your desired skills sign up or update availability, they will appear here!"
                actionLabel="Update Learning Skills"
                onAction={() => window.location.assign("/settings")}
                secondaryActionLabel="Explore Discover"
                onSecondaryAction={() => window.location.assign("/discover")}
              />
            )}

            {!isAiLoading && aiRecommendations.length > 0 && (
              <div className="grid gap-5 lg:grid-cols-2">
                {aiRecommendations.map((rec) => {
                  const initials = rec.name
                    ? rec.name
                        .split(" ")
                        .map((p) => p.charAt(0))
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "??";

                  const currentFeedback = feedbackGiven[rec.userId];

                  return (
                    <div
                      key={rec.userId}
                      className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between"
                    >
                      <div>
                        {/* Header: User Info & Match Badge */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white font-extrabold text-sm shadow">
                              {initials}
                            </div>
                            <div>
                              <Link
                                to={`/profile/${rec.username}`}
                                className="font-bold text-base text-slate-900 hover:text-emerald-600 transition"
                              >
                                {rec.name}
                              </Link>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span>@{rec.username}</span>
                                <span>•</span>
                                <span>{rec.location || "Remote"}</span>
                                {rec.averageRating > 0 && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-0.5 font-semibold text-slate-800">
                                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                      {rec.averageRating.toFixed(1)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end">
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-xs font-extrabold text-emerald-700 flex items-center gap-1">
                              <Sparkles className="h-3 w-3" />
                              {rec.score}% Match
                            </span>
                            <span className="text-[10px] text-slate-400 font-semibold mt-1">
                              Two-Way Reciprocal
                            </span>
                          </div>
                        </div>

                        {/* Explainable match breakdown */}
                        <div className="mt-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 p-3.5 text-xs text-slate-700 leading-relaxed">
                          <p className="font-semibold text-emerald-950 mb-1 flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            Why Recommended:
                          </p>
                          <p className="text-slate-600">{rec.explanation}</p>
                        </div>

                        {/* Complementary Skills Matrix */}
                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                          <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              They teach you
                            </span>
                            <span className="font-bold text-emerald-800">
                              {rec.matchedTeachingSkill}
                            </span>
                          </div>

                          <div className="rounded-xl bg-slate-50 p-2.5 border border-slate-100">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                              You teach them
                            </span>
                            <span className="font-bold text-slate-800">
                              {rec.matchedLearningSkill}
                            </span>
                          </div>
                        </div>

                        {/* Availability Overlap */}
                        {rec.matchingDays && rec.matchingDays.length > 0 && (
                          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>Mutual Days:</span>
                            <div className="flex flex-wrap gap-1">
                              {rec.matchingDays.map((d, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="rounded bg-slate-100 px-1.5 py-0.5 font-semibold text-slate-700 text-[11px]"
                                >
                                  {d}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Footer Actions & Feedback */}
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                        {/* Feedback buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleFeedback(rec.userId, "HELPFUL")}
                            disabled={!!currentFeedback}
                            className={`rounded-lg p-1.5 text-xs transition flex items-center gap-1 ${
                              currentFeedback === "HELPFUL"
                                ? "bg-emerald-100 text-emerald-800 font-bold"
                                : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            }`}
                            title="Helpful recommendation"
                          >
                            <ThumbsUp className="h-3.5 w-3.5" />
                            {currentFeedback === "HELPFUL" && "Saved"}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleFeedback(rec.userId, "NOT_INTERESTED")}
                            disabled={!!currentFeedback}
                            className="rounded-lg p-1.5 text-xs text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Not interested (suppress future recommendations)"
                          >
                            <EyeOff className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <Link
                          to={`/profile/${rec.username}`}
                          className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500 flex items-center gap-1.5"
                        >
                          View & Propose Swap
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ================= STANDARD MATCHES TAB ================= */}
        {activeTab === "standard" && (
          <div className="mt-8 space-y-6">
            {!isLoading && !isError && user?.isOnboarded && (
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-950">Recommended Swaps</h2>
                <p className="text-sm text-slate-500" aria-live="polite">
                  {totalCount} {totalCount === 1 ? "match" : "matches"} found
                </p>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && (
              <div className="grid gap-5 lg:grid-cols-2">
                <CardSkeleton count={4} />
              </div>
            )}

            {/* Error state */}
            {isError && (
              <ErrorState
                title="Unable to load skill matches"
                message={(error as Error)?.message || "An unexpected error occurred while calculating your skill matches."}
                onRetry={() => refetch()}
              />
            )}

            {/* Empty state */}
            {!isLoading && !isError && matches.length === 0 && (
              <EmptyState
                title="No compatible matches found yet"
                description="We couldn't find complementary swap partners matching your exact teaching and learning skills right now. Try adding more skills or widening your availability, or discover members manually!"
                actionLabel="Update My Skills"
                onAction={() => window.location.assign("/settings")}
                secondaryActionLabel="Explore Discover"
                onSecondaryAction={() => window.location.assign("/discover")}
              />
            )}

            {/* Matches Grid */}
            {!isLoading && !isError && matches.length > 0 && (
              <div className="grid gap-5 lg:grid-cols-2">
                {matches.map((match) => {
                  const initials = match.user.name
                    ? match.user.name
                        .split(" ")
                        .map((p) => p.charAt(0))
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : "??";

                  return (
                    <SkillMatchCard
                      key={match.userId}
                      username={match.user.username}
                      name={match.user.name}
                      initials={initials}
                      location={match.user.location || "Remote"}
                      teaches={
                        match.theyCanTeachYou.length > 0
                          ? match.theyCanTeachYou
                          : "Various skills"
                      }
                      wantsToLearn={
                        match.youCanTeachThem.length > 0
                          ? match.youCanTeachThem
                          : "Various skills"
                      }
                      matchPercentage={match.compatibilityScore}
                      skillCompatibility={match.skillCompatibility}
                      availabilityMatch={match.availabilityMatch}
                      rating={match.user.averageRating || 5.0}
                      isReciprocal={match.isReciprocal}
                      explanation={match.explanation}
                      matchingDays={match.matchingDays}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default Matches;
