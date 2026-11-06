import { RatingStars } from './RatingStars';
import type { Review } from '../../types/review';

interface ReviewCardProps {
  review: Review;
}

export const ReviewCard = ({ review }: ReviewCardProps) => {
  const reviewer = review.reviewer;
  const initials = reviewer.name
    ? reviewer.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : '??';

  const formattedDate = new Date(review.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
            {initials}
          </div>

          <div>
            <p className="font-semibold text-slate-950">{reviewer.name}</p>
            <p className="text-xs text-slate-500">@{reviewer.username}</p>
          </div>
        </div>

        <div className="text-right">
          <RatingStars rating={review.rating} readOnly size="sm" />
          <p className="mt-1 text-xs text-slate-400">{formattedDate}</p>
        </div>
      </div>

      {review.skill && (
        <div className="mt-3">
          <span className="inline-block rounded-md bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
            Taught: {review.skill.name}
          </span>
        </div>
      )}

      {review.comment ? (
        <p className="mt-3 text-sm leading-relaxed text-slate-700">“{review.comment}”</p>
      ) : (
        <p className="mt-2 text-xs italic text-slate-400">No written feedback provided.</p>
      )}
    </div>
  );
};

