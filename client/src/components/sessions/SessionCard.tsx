import { useState } from 'react';
import type { SessionWithDetails } from '../../types/session';

export interface SessionCardProps {
  session?: SessionWithDetails;
  name?: string;
  skill?: string;
  date?: string;
  time?: string;
  duration?: number;
  status?: string;

  currentUserId?: number;
  onJoinMeeting?: (session: SessionWithDetails) => void;
  onReschedule?: (session: SessionWithDetails) => void;
  onCancel?: (session: SessionWithDetails) => void;
  onConfirmCompletion?: (session: SessionWithDetails) => void;
  onDisputeCompletion?: (session: SessionWithDetails) => void;
  onAcceptReschedule?: (session: SessionWithDetails) => void;
  onRejectReschedule?: (session: SessionWithDetails) => void;
  onMarkComplete?: (session: SessionWithDetails) => void;
  onLeaveReview?: (session: SessionWithDetails) => void;
  hasReviewed?: boolean;
}

const SessionCard = ({
  session,
  name,
  skill,
  date,
  time,
  duration,
  status,
  currentUserId,
  onJoinMeeting,
  onReschedule,
  onCancel,
  onConfirmCompletion,
  onDisputeCompletion,
  onAcceptReschedule,
  onRejectReschedule,
  onMarkComplete,
  onLeaveReview,
  hasReviewed,
}: SessionCardProps) => {
  // If full session object is provided, derive dynamic fields
  let displayName = name || 'Partner';
  let displaySkill = skill || 'Skill';
  let displayDuration = duration || 60;
  let displayStatus = status || 'upcoming';
  let formattedDate = date || '';
  let formattedTime = time || '';
  let isTeacher = false;
  let canJoin = false;
  let isAwaitingMyConfirmation = false;
  let isAwaitingMyRescheduleResponse = false;
  let proposedDateFormatted = '';

  const [currentTime] = useState(() => Date.now());

  if (session) {
    isTeacher = session.teacherId === currentUserId;
    const partner = isTeacher ? session.learner : session.teacher;
    displayName = partner.name || partner.username || 'Partner';
    displaySkill = session.skill.name;
    displayDuration = session.duration || 60;
    displayStatus = session.status;

    const startIso = session.scheduledStart || session.scheduledAt || '';
    const startObj = startIso ? new Date(startIso) : new Date(0);
    formattedDate = startObj.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    formattedTime = startObj.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    const now = currentTime;
    const startMs = startObj.getTime();
    const endMs = session.scheduledEnd
      ? new Date(session.scheduledEnd).getTime()
      : startMs + displayDuration * 60 * 1000;

    canJoin =
      now >= startMs - 15 * 60 * 1000 &&
      now <= endMs + 60 * 60 * 1000 &&
      !['CANCELLED', 'DISPUTED'].includes(session.status);

    isAwaitingMyConfirmation =
      session.status === 'COMPLETION_PENDING' && session.completedBy !== currentUserId;

    isAwaitingMyRescheduleResponse =
      session.status === 'RESCHEDULE_PROPOSED' && session.rescheduledBy !== currentUserId;

    if (session.proposedStart) {
      const pObj = new Date(session.proposedStart);
      proposedDateFormatted = `${pObj.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })} at ${pObj.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
    }
  }

  const getStatusStyles = () => {
    switch (displayStatus.toUpperCase()) {
      case 'SCHEDULED':
      case 'UPCOMING':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'IN_PROGRESS':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 font-bold';
      case 'COMPLETION_PENDING':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'RESCHEDULE_PROPOSED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'COMPLETED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'DISPUTED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const formatStatusLabel = (s: string) => {
    switch (s.toUpperCase()) {
      case 'COMPLETION_PENDING':
        return 'Pending Confirmation';
      case 'RESCHEDULE_PROPOSED':
        return 'Reschedule Proposed';
      case 'IN_PROGRESS':
        return 'In Progress';
      default:
        return s.toLowerCase();
    }
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left info */}
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-xl font-bold text-emerald-600">
            {isTeacher ? '🎓' : '💻'}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-bold text-slate-950">{displaySkill}</p>

              {session && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                  {isTeacher ? 'You teach' : 'You learn'}
                </span>
              )}

              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getStatusStyles()}`}
              >
                {formatStatusLabel(displayStatus)}
              </span>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Session with <span className="font-semibold text-slate-800">{displayName}</span>
            </p>

            {session?.notes && (
              <p className="mt-1 text-xs text-slate-400 italic">“{session.notes}”</p>
            )}
          </div>
        </div>

        {/* Right time & controls */}
        <div className="flex flex-wrap items-center gap-4 sm:justify-end">
          <div className="text-left sm:text-right">
            <p className="text-sm font-semibold text-slate-800">{formattedDate}</p>
            <p className="mt-0.5 text-xs text-slate-500">
              {formattedTime} · {displayDuration} min
            </p>
          </div>

          {session && (
            <div className="flex flex-wrap items-center gap-2">
              {/* Join button */}
              {(session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS') && (
                <button
                  type="button"
                  onClick={() => onJoinMeeting?.(session)}
                  className={`rounded-xl px-4 py-2 text-xs font-semibold shadow-xs transition ${
                    canJoin
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700 ring-2 ring-emerald-500/20'
                      : 'border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                  title={canJoin ? 'Join meeting now' : 'Room opens 15 minutes before session start'}
                >
                  {canJoin ? '📹 Join Meeting' : '📹 Meeting Info'}
                </button>
              )}

              {/* Reschedule button */}
              {(session.status === 'SCHEDULED' || session.status === 'RESCHEDULE_PROPOSED') && (
                <button
                  type="button"
                  onClick={() => onReschedule?.(session)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Reschedule
                </button>
              )}

              {/* Mark Complete button */}
              {(session.status === 'SCHEDULED' || session.status === 'IN_PROGRESS') && (
                <button
                  type="button"
                  onClick={() => onMarkComplete?.(session)}
                  className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 transition"
                >
                  Mark Complete
                </button>
              )}

              {/* Cancel button */}
              {['SCHEDULED', 'RESCHEDULE_PROPOSED', 'REQUESTED'].includes(session.status) && (
                <button
                  type="button"
                  onClick={() => onCancel?.(session)}
                  className="rounded-xl p-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition"
                  title="Cancel session"
                >
                  ✕
                </button>
              )}

              {/* Review button for completed sessions */}
              {session.status === 'COMPLETED' && (
                !isTeacher ? (
                  hasReviewed ? (
                    <span className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-1.5 text-xs font-semibold text-amber-800">
                      ★ Reviewed
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onLeaveReview?.(session)}
                      className="rounded-xl bg-amber-500 hover:bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition flex items-center gap-1.5"
                    >
                      <span>★</span> Leave Review
                    </button>
                  )
                ) : (
                  <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-800">
                    ✓ Completed
                  </span>
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Proposal review banner */}
      {session && isAwaitingMyRescheduleResponse && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold">{displayName}</span> proposed rescheduling to{' '}
              <span className="font-bold">{proposedDateFormatted}</span>.
              {session.rescheduleReason && (
                <p className="mt-0.5 text-amber-700 italic">“{session.rescheduleReason}”</p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onAcceptReschedule?.(session)}
                className="rounded-lg bg-emerald-600 px-3 py-1 font-semibold text-white hover:bg-emerald-700 transition"
              >
                Accept
              </button>
              <button
                type="button"
                onClick={() => onRejectReschedule?.(session)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Confirmation review banner */}
      {session && isAwaitingMyConfirmation && (
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-3 text-xs text-purple-900">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-bold">{displayName}</span> marked this session as completed.
              Did the session take place successfully?
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onConfirmCompletion?.(session)}
                className="rounded-lg bg-purple-700 px-3 py-1 font-semibold text-white hover:bg-purple-800 transition"
              >
                Confirm Completed ✓
              </button>
              <button
                type="button"
                onClick={() => onDisputeCompletion?.(session)}
                className="rounded-lg border border-red-200 bg-white px-3 py-1 font-semibold text-red-600 hover:bg-red-50 transition"
              >
                Dispute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionCard;
