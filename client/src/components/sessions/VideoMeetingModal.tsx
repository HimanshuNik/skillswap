import { useState, useEffect } from 'react';
import { X, ExternalLink, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { useCompleteSession } from '../../hooks/useSessions';
import type { SessionWithDetails } from '../../types/session';

interface VideoMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionWithDetails | null;
  onSessionUpdated?: (updated: SessionWithDetails) => void;
}

export const VideoMeetingModal = ({
  isOpen,
  onClose,
  session,
  onSessionUpdated,
}: VideoMeetingModalProps) => {
  const { user } = useAuthStore();
  const completeMutation = useCompleteSession();
  const [completeSuccess, setCompleteSuccess] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !session) return null;

  const displayName = encodeURIComponent(user?.name || user?.username || 'SkillSwap Member');
  const meetingRoomId = session.meetingRoomId || `skillswap-${session.id}`;
  const iframeSrc = `https://meet.jit.si/${meetingRoomId}#userInfo.displayName="${displayName}"`;
  const partner = session.teacherId === user?.id ? session.learner : session.teacher;
  const isTeacher = session.teacherId === user?.id;

  const handleMarkComplete = async () => {
    setErrorText(null);
    try {
      const updated = await completeMutation.mutateAsync(session.id);
      setCompleteSuccess(true);
      onSessionUpdated?.(updated);
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Failed to mark session as complete.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-2 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="video-modal-title"
    >
      <div className="relative flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 font-bold">
              📹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="video-modal-title" className="text-base font-bold text-white sm:text-lg">
                  {session.skill.name} Session
                </h2>
                <span className="rounded-full bg-emerald-950 border border-emerald-800 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  {isTeacher ? 'You are Teaching' : 'You are Learning'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Partner: <span className="text-white font-medium">{partner.name}</span> · {session.duration} min
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 sm:mt-0">
            <a
              href={`https://meet.jit.si/${meetingRoomId}`}
              target="_blank"
              rel="noreferrer"
              aria-label="Open video call in a new browser window"
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>New Window</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>

            {session.status !== 'COMPLETED' && session.status !== 'COMPLETION_PENDING' && (
              <button
                type="button"
                onClick={handleMarkComplete}
                disabled={completeMutation.isPending || completeSuccess}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <CheckCircle className="h-3.5 w-3.5" />
                <span>
                  {completeSuccess
                    ? 'Completion Pending'
                    : completeMutation.isPending
                    ? 'Saving...'
                    : 'Mark as Complete'}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              aria-label="Close video call window"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition ml-2 focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {errorText && (
          <div className="bg-red-950/80 border-b border-red-800 px-4 py-2 text-xs text-red-200" role="alert">
            {errorText}
          </div>
        )}

        {completeSuccess && (
          <div className="bg-emerald-950/80 border-b border-emerald-800 px-4 py-2 text-xs text-emerald-200" role="status">
            Session marked complete! Awaiting {partner.name}'s confirmation to record the completed swap.
          </div>
        )}

        {/* Video Call Embed Frame */}
        <div className="relative flex-1 bg-slate-950">
          <iframe
            src={iframeSrc}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="h-full w-full border-0"
            title={`SkillSwap Video Room for ${session.skill.name}`}
          />
        </div>
      </div>
    </div>
  );
};
