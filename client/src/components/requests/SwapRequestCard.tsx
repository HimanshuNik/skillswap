import { Link } from 'react-router-dom';
import type { SwapRequest } from '../../types/swapRequest';
import RequestStatusBadge from './RequestStatusBadge';

interface SwapRequestCardProps {
  request: SwapRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: (requestId: number) => void;
  onReject?: (requestId: number) => void;
  onCancel?: (requestId: number) => void;
  isProcessing?: boolean;
}

export const SwapRequestCard = ({
  request,
  type,
  onAccept,
  onReject,
  onCancel,
  isProcessing = false,
}: SwapRequestCardProps) => {
  const otherUser = type === 'incoming' ? request.sender : request.receiver;

  const initials = otherUser.name
    ? otherUser.name
        .split(' ')
        .map((p) => p[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '??';

  const formattedDate = new Date(request.createdAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:shadow-md">
      {/* Top Header: User info and status badge */}
      <div className="flex items-start justify-between gap-4">
        <Link
          to={`/profile/${otherUser.username}`}
          className="flex items-center gap-3 group"
        >
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-slate-950 font-bold text-white transition group-hover:bg-slate-800">
            {initials}
          </div>
          <div>
            <h3 className="font-bold text-slate-950 group-hover:text-emerald-600 transition">
              {otherUser.name}
            </h3>
            <p className="text-xs text-slate-500">
              @{otherUser.username} • ★ {otherUser.averageRating.toFixed(1)}
            </p>
          </div>
        </Link>

        <div className="flex flex-col items-end gap-1">
          <RequestStatusBadge status={request.status} />
          <span className="text-xs text-slate-400">{formattedDate}</span>
        </div>
      </div>

      {/* Reciprocal Skills Exchange Details */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 p-3.5">
          <p className="text-xs font-semibold text-emerald-800">
            {type === 'incoming' ? `${otherUser.name} offers to teach` : 'You offer to teach'}
          </p>
          <p className="mt-1 font-bold text-slate-950">
            {request.senderSkill.name}
          </p>
          <span className="text-xs text-emerald-600 font-medium">
            {request.senderSkill.category}
          </span>
        </div>

        <div className="rounded-xl bg-slate-50 p-3.5">
          <p className="text-xs font-semibold text-slate-600">
            {type === 'incoming' ? 'In exchange for your' : `${otherUser.name} will teach`}
          </p>
          <p className="mt-1 font-bold text-slate-950">
            {request.receiverSkill.name}
          </p>
          <span className="text-xs text-slate-500 font-medium">
            {request.receiverSkill.category}
          </span>
        </div>
      </div>

      {/* Introductory message if provided */}
      {request.message && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/60 p-3 text-sm text-slate-600 italic">
          "{request.message}"
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
        {type === 'incoming' && request.status === 'PENDING' && (
          <>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onReject?.(request.id)}
              className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Decline
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onAccept?.(request.id)}
              className="rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-50"
            >
              {isProcessing ? 'Accepting...' : 'Accept Swap'}
            </button>
          </>
        )}

        {type === 'outgoing' && request.status === 'PENDING' && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onCancel?.(request.id)}
            className="rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50"
          >
            {isProcessing ? 'Cancelling...' : 'Cancel Request'}
          </button>
        )}

        {request.status === 'ACCEPTED' && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-emerald-700">✓ Swap Agreement Established</span>
            <Link
              to="/messages"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Open Chat →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwapRequestCard;

