import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Award, Star } from "lucide-react";
import { toast } from "sonner";
import AppLayout from "../components/app/AppLayout";
import { usePublicProfile, useMyProfile } from "../hooks/useUserProfile";
import { useActiveSwapWithUser } from "../hooks/useSwapRequests";
import { useUserReviews, useUserReputation } from "../hooks/useReviews";
import { useAuthStore } from "../store/useAuthStore";
import { gamificationApi, type PublicGamificationProfile } from "../lib/gamificationApi";
import SwapRequestModal from "../components/requests/SwapRequestModal";
import { ReportUserModal } from "../components/modals/ReportUserModal";
import { ReputationSummary } from "../components/reviews/ReputationSummary";
import { ReviewCard } from "../components/reviews/ReviewCard";

const Profile = () => {
  const { username = "" } = useParams();
  const { data: profile, isLoading, error } = usePublicProfile(username);
  const { data: myProfile } = useMyProfile();
  const { user: currentUser } = useAuthStore();
  const { data: activeSwap } = useActiveSwapWithUser(profile?.id);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reviewsSort, setReviewsSort] = useState<'newest' | 'highest' | 'lowest'>('newest');

  const { data: reviewsData, isLoading: isReviewsLoading } = useUserReviews(profile?.id, 1, reviewsSort);
  const { data: reputation } = useUserReputation(profile?.id);

  const { data: gamifProfile } = useQuery<PublicGamificationProfile>({
    queryKey: ['profile-gamification', username],
    queryFn: () => gamificationApi.getPublicProfile(username),
    enabled: !!username,
  });

  const isSelf = currentUser?.username === username;

  if (isLoading) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <div className="flex min-h-[300px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
              <p className="text-sm font-medium text-slate-500">Loading profile...</p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user doesn't exist
  if (!profile || error) {
    return (
      <AppLayout>
        <div className="mx-auto max-w-5xl">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-20 text-center">
            <div className="text-4xl">👤</div>

            <h1 className="mt-4 text-xl font-bold text-slate-950">
              Profile not found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              User @{username} does not exist on SkillSwap.
            </p>

            <Link
              to="/dashboard"
              className="mt-6 inline-block rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((p) => p.charAt(0))
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "??";

  return (
    <AppLayout>
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-sm font-semibold text-emerald-600">
          Public Profile
        </p>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xl font-bold text-white">
                {initials}
              </div>

              <div>
                <h1 className="text-2xl font-bold text-slate-950 flex items-center gap-2">
                  {profile.name}
                  {gamifProfile?.level && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
                      <Trophy className="w-3.5 h-3.5 text-amber-500" />
                      Lvl {gamifProfile.level.currentLevel} • {gamifProfile.level.title}
                    </span>
                  )}
                </h1>

                <p className="mt-1 text-sm text-slate-500">
                  @{profile.username} {profile.location ? `• ${profile.location}` : ""}
                </p>

                <div className="mt-3 flex flex-wrap gap-4 text-sm">
                  <span className="font-semibold text-slate-700">
                    ★ {(reputation?.averageRating ?? profile.averageRating).toFixed(1)} ({(reputation?.totalReviews ?? profile.totalReviews)} reviews)
                  </span>

                  <span className="text-slate-500">
                    {reputation?.completedTeachingSessions ?? profile.completedSessions} sessions completed
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              {isSelf ? (
                <Link
                  to="/settings"
                  className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Edit in Settings
                </Link>
              ) : activeSwap?.status === "PENDING" ? (
                activeSwap.senderId === currentUser?.id ? (
                  <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-800 border border-amber-200">
                    <span>⏳</span> Request Pending
                  </div>
                ) : (
                  <Link
                    to="/requests"
                    className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
                  >
                    Respond to Request
                  </Link>
                )
              ) : activeSwap?.status === "ACCEPTED" ? (
                <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 border border-emerald-200">
                  <span>✓</span> Connected
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsModalOpen(true)}
                  className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  Send swap request
                </button>
              )}

              {!isSelf && (
                <button
                  type="button"
                  onClick={() => setReportModalOpen(true)}
                  className="rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-500 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition"
                  title="Report user conduct"
                >
                  Flag Profile
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="font-bold text-slate-950">About</h2>

            <p className="mt-2 max-w-3xl leading-7 text-slate-600">
              {profile.bio || "This user hasn't written a bio yet."}
            </p>
          </div>

          <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
            <div>
              <h2 className="font-bold text-slate-950">Can teach</h2>

              <p className="mt-1 text-sm text-slate-500">
                Skills this person can help you learn.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.teachingSkills.length > 0 ? (
                  profile.teachingSkills.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700"
                    >
                      {item.skill.name} • {item.proficiencyLevel}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No teaching skills listed yet.</p>
                )}
              </div>
            </div>

            <div>
              <h2 className="font-bold text-slate-950">Wants to learn</h2>

              <p className="mt-1 text-sm text-slate-500">
                Skills this person is interested in picking up.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {profile.learningSkills.length > 0 ? (
                  profile.learningSkills.map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700"
                    >
                      {item.skill.name} • {item.targetLevel}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400 italic">No learning skills listed yet.</p>
                )}
              </div>
            </div>
          </div>

          {/* Earned Achievements & Badges */}
          {gamifProfile?.badges && gamifProfile.badges.length > 0 && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                <h2 className="font-bold text-slate-950">Earned Badges & Achievements</h2>
              </div>
              <p className="mt-1 text-sm text-slate-500">
                Verified platform milestones and peer coaching accomplishments.
              </p>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {gamifProfile.badges.map((b) => (
                  <div
                    key={b.code}
                    className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 shadow-2xs"
                  >
                    <div className="rounded-xl bg-emerald-600 p-2 text-white">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">{b.title}</span>
                        {b.isFeatured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-400" />}
                      </div>
                      <span className="text-[11px] text-slate-500 line-clamp-1">{b.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Reviews & Reputation */}
        <section className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">Reviews & Reputation</h2>
              <p className="mt-1 text-sm text-slate-500">
                Verified feedback from SkillSwap sessions taught by {profile.name}.
              </p>
            </div>

            {reviewsData && reviewsData.total > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500">Sort by:</span>
                <select
                  value={reviewsSort}
                  onChange={(e) => setReviewsSort(e.target.value as 'newest' | 'highest' | 'lowest')}
                  className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-emerald-500 focus:outline-none"
                >
                  <option value="newest">Most Recent</option>
                  <option value="highest">Highest Rating</option>
                  <option value="lowest">Lowest Rating</option>
                </select>
              </div>
            )}
          </div>

          <div className="mt-6">
            <ReputationSummary reputation={reputation} />
          </div>

          <div className="mt-6 space-y-3">
            {isReviewsLoading ? (
              <div className="py-8 text-center text-sm text-slate-400">Loading reviews...</div>
            ) : reviewsData && reviewsData.reviews.length > 0 ? (
              reviewsData.reviews.map((rev) => <ReviewCard key={rev.id} review={rev} />)
            ) : (
              <p className="py-6 text-center text-sm italic text-slate-400">
                No reviews yet. Completed sessions will feature learner feedback here.
              </p>
            )}
          </div>
        </section>

        {/* Modal */}
        {profile && myProfile && (
          <SwapRequestModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            recipient={profile}
            myTeachingSkills={myProfile.teachingSkills || []}
            myLearningSkills={myProfile.learningSkills || []}
            onSuccess={() => toast.success(`Swap request sent to ${profile.name}!`)}
          />
        )}

        {profile && (
          <ReportUserModal
            isOpen={reportModalOpen}
            onClose={() => setReportModalOpen(false)}
            reportedUserId={profile.id}
            reportedUserName={profile.name}
            targetType="USER"
          />
        )}
      </div>
    </AppLayout>
  );
};

export default Profile;
