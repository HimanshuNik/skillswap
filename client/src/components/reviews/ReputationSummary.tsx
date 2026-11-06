import { RatingStars } from './RatingStars';
import type { UserReputation } from '../../types/review';

interface ReputationSummaryProps {
  reputation?: UserReputation;
}

export const ReputationSummary = ({ reputation }: ReputationSummaryProps) => {
  if (!reputation || !reputation.hasReviews) {
    return (
      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white text-xl font-bold text-slate-700 shadow-xs">
          🌱
        </div>
        <div>
          <p className="font-bold text-slate-900">New Member</p>
          <p className="text-xs text-slate-500">
            No session reviews yet. Verified reviews will appear after teaching completed sessions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
      <div className="flex items-center gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-2xl font-black text-amber-500">
          ★
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-950">
              {reputation.averageRating.toFixed(1)}
            </span>
            <span className="text-xs font-semibold text-slate-500">/ 5.0</span>
          </div>
          <div className="mt-1">
            <RatingStars rating={Math.round(reputation.averageRating)} readOnly size="sm" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-slate-600">
        <div>
          <p className="text-xl font-bold text-slate-950">{reputation.totalReviews}</p>
          <p className="text-xs text-slate-500">Verified Reviews</p>
        </div>
        <div className="h-8 border-l border-slate-200" />
        <div>
          <p className="text-xl font-bold text-slate-950">{reputation.completedTeachingSessions}</p>
          <p className="text-xs text-slate-500">Sessions Taught</p>
        </div>
      </div>
    </div>
  );
};

