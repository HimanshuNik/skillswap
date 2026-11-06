import { useEffect } from 'react';
import { X, ExternalLink, Users, Video } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import type { GroupSessionItem } from '../../lib/collaborationApi';

interface GroupVideoMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: GroupSessionItem | null;
}

export const GroupVideoMeetingModal = ({
  isOpen,
  onClose,
  session,
}: GroupVideoMeetingModalProps) => {
  const { user } = useAuthStore();

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

  const displayName = encodeURIComponent(user?.name || user?.username || 'Group Member');
  const meetingRoomId = session.meetingRoomId || `skillswap-group-${session.id}`;
  const iframeSrc = `https://meet.jit.si/${meetingRoomId}#userInfo.displayName="${displayName}"`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="group-video-modal-title"
    >
      <div className="relative flex h-[92vh] w-full max-w-5xl flex-col rounded-2xl bg-slate-900 shadow-2xl border border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-400">
              <Video className="h-5 w-5" />
            </div>
            <div>
              <h2 id="group-video-modal-title" className="text-base font-semibold text-white truncate max-w-md">
                {session.title}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  Host: {session.host.name}
                </span>
                <span>•</span>
                <span className="text-emerald-400 font-medium">Live Group Video Meeting</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={`https://meet.jit.si/${meetingRoomId}`}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Open in tab</span>
            </a>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Video Frame */}
        <div className="relative flex-1 bg-black">
          <iframe
            src={iframeSrc}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className="h-full w-full border-0"
            title="SkillSwap Group Learning Video Call"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-950/80 px-5 py-2.5 text-xs text-slate-400">
          <span>End-to-end web meeting powered by Jitsi Meet. Keep your camera and mic ready.</span>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 px-4 py-1.5 font-medium text-slate-200 hover:bg-slate-700"
          >
            Leave Call
          </button>
        </div>
      </div>
    </div>
  );
};

