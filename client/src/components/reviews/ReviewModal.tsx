import { useState } from 'react';
import { RatingStars } from './RatingStars';
import { useCreateReview } from '../../hooks/useReviews';
import type { SessionWithDetails } from '../../types/session';
import type { Review } from '../../types/review';
import { Modal } from '../ui/Modal';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionWithDetails | null;
  onSuccess?: (review: Review) => void;
}

export const ReviewModal = ({
  isOpen,
  onClose,
  session,
  onSuccess,
}: ReviewModalProps) => {
  const createReview = useCreateReview();
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const handleClose = () => {
    setRating(5);
    setComment('');
    setErrorText(null);
    onClose();
  };

  if (!session) return null;

  const teacherName = session.teacher?.name || 'Your Teacher';
  const skillName = session.skill?.name || 'Skill';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (rating < 1 || rating > 5) {
      setErrorText('Please select a star rating between 1 and 5.');
      return;
    }

    try {
      const review = await createReview.mutateAsync({
        sessionId: session.id,
        rating,
        comment: comment.trim() || undefined,
      });

      onSuccess?.(review);
      handleClose();
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Failed to submit review.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Review Teaching Session"
      description={`Share your feedback on ${teacherName}'s teaching of ${skillName}.`}
      maxWidth="lg"
    >
      {errorText && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-900">
            Your Rating
          </label>
          <div className="mt-2 flex items-center gap-3">
            <RatingStars rating={rating} onChange={(r) => setRating(r)} size="lg" />
            <span className="text-sm font-bold text-slate-700">
              {rating === 5
                ? '5 - Outstanding'
                : rating === 4
                ? '4 - Very Good'
                : rating === 3
                ? '3 - Good'
                : rating === 2
                ? '2 - Fair'
                : '1 - Poor'}
            </span>
          </div>
        </div>

        <div>
          <label htmlFor="review-feedback-input" className="block text-sm font-semibold text-slate-900">
            Written Feedback (Optional)
          </label>
          <textarea
            id="review-feedback-input"
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="How was the explanation, patience, and learning experience? Share constructive feedback for the community..."
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={createReview.isPending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {createReview.isPending ? 'Submitting...' : 'Post Review'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
