import { useState, useMemo } from 'react';
import AppLayout from '../components/app/AppLayout';
import SessionCard from '../components/sessions/SessionCard';
import { ScheduleSessionModal } from '../components/sessions/ScheduleSessionModal';
import { RescheduleModal } from '../components/sessions/RescheduleModal';
import { CancelSessionModal } from '../components/sessions/CancelSessionModal';
import { VideoMeetingModal } from '../components/sessions/VideoMeetingModal';
import { ReviewModal } from '../components/reviews/ReviewModal';
import {
  useSessions,
  useRespondReschedule,
  useConfirmCompletion,
  useCompleteSession,
} from '../hooks/useSessions';
import { useIncomingRequests, useOutgoingRequests } from '../hooks/useSwapRequests';
import { useAuthStore } from '../store/useAuthStore';
import type { SessionWithDetails } from '../types/session';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';

type SessionFilter = 'upcoming' | 'past' | 'all';

const filters: {
  label: string;
  value: SessionFilter;
}[] = [
  {
    label: 'Upcoming',
    value: 'upcoming',
  },
  {
    label: 'Past',
    value: 'past',
  },
  {
    label: 'All',
    value: 'all',
  },
];

const Sessions = () => {
  const { user } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<SessionFilter>('upcoming');

  // Modals state
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [rescheduleTargetSession, setRescheduleTargetSession] = useState<SessionWithDetails | null>(null);
  const [cancelTargetSession, setCancelTargetSession] = useState<SessionWithDetails | null>(null);
  const [videoMeetingTargetSession, setVideoMeetingTargetSession] = useState<SessionWithDetails | null>(null);
  const [reviewTargetSession, setReviewTargetSession] = useState<SessionWithDetails | null>(null);

  // Queries
  const { data: sessions = [], isLoading, error, refetch } = useSessions(activeFilter);
  const { data: incomingRequests = [] } = useIncomingRequests();
  const { data: outgoingRequests = [] } = useOutgoingRequests();

  // Mutations
  const respondReschedule = useRespondReschedule();
  const confirmCompletion = useConfirmCompletion();
  const completeSession = useCompleteSession();

  // Compute accepted swap agreements for session booking
  const availableSwaps = useMemo(() => {
    if (!user) return [];
    const swaps: Array<{
      id: number;
      partnerName: string;
      partnerId: number;
      myTeachingSkillId: number;
      myTeachingSkillName: string;
      theirTeachingSkillId: number;
      theirTeachingSkillName: string;
    }> = [];

    // Outgoing accepted swaps: user is sender
    for (const r of outgoingRequests) {
      if (r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS') {
        swaps.push({
          id: r.id,
          partnerName: r.receiver?.name || 'Partner',
          partnerId: r.receiverId,
          myTeachingSkillId: r.senderSkillId,
          myTeachingSkillName: r.senderSkill?.name || 'Skill',
          theirTeachingSkillId: r.receiverSkillId,
          theirTeachingSkillName: r.receiverSkill?.name || 'Skill',
        });
      }
    }

    // Incoming accepted swaps: user is receiver
    for (const r of incomingRequests) {
      if (r.status === 'ACCEPTED' || r.status === 'IN_PROGRESS') {
        swaps.push({
          id: r.id,
          partnerName: r.sender?.name || 'Partner',
          partnerId: r.senderId,
          myTeachingSkillId: r.receiverSkillId,
          myTeachingSkillName: r.receiverSkill?.name || 'Skill',
          theirTeachingSkillId: r.senderSkillId,
          theirTeachingSkillName: r.senderSkill?.name || 'Skill',
        });
      }
    }

    return swaps;
  }, [user, outgoingRequests, incomingRequests]);

  const handleAcceptReschedule = async (s: SessionWithDetails) => {
    try {
      await respondReschedule.mutateAsync({ id: s.id, action: 'ACCEPT' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to accept reschedule.');
    }
  };

  const handleRejectReschedule = async (s: SessionWithDetails) => {
    try {
      await respondReschedule.mutateAsync({ id: s.id, action: 'REJECT' });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to decline reschedule.');
    }
  };

  const handleConfirmCompletion = async (s: SessionWithDetails) => {
    try {
      await confirmCompletion.mutateAsync({ id: s.id, payload: { action: 'CONFIRM' } });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to confirm completion.');
    }
  };

  const handleDisputeCompletion = async (s: SessionWithDetails) => {
    const reason = window.prompt('Please describe the issue or reason for disputing this session:');
    if (!reason || reason.trim().length === 0) return;
    try {
      await confirmCompletion.mutateAsync({
        id: s.id,
        payload: { action: 'DISPUTE', disputeReason: reason.trim() },
      });
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to dispute completion.');
    }
  };

  const handleMarkComplete = async (s: SessionWithDetails) => {
    try {
      await completeSession.mutateAsync(s.id);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to mark session as complete.');
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-emerald-600">Sessions</p>

            <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">
              Your learning sessions
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your upcoming, in-progress, and completed SkillSwap sessions.
            </p>
          </div>

          <div>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <span>+</span>
              <span>Schedule Session</span>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap gap-2" role="tablist" aria-label="Session filter">
          {filters.map((filter) => {
            const isActive = activeFilter === filter.value;

            return (
              <button
                key={filter.value}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(filter.value)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  isActive
                    ? 'bg-slate-950 text-white'
                    : 'border border-slate-300 bg-white text-slate-600 hover:border-slate-400'
                }`}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="mt-8 space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && !isLoading && (
          <div className="mt-8">
            <ErrorState
              title="Failed to load sessions"
              message={(error as Error)?.message || "An unexpected error occurred while loading your sessions."}
              onRetry={() => refetch()}
            />
          </div>
        )}

        {/* Sessions List */}
        {!isLoading && !error && sessions.length > 0 && (
          <div className="mt-8 space-y-4">
            {sessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                currentUserId={user?.id}
                onJoinMeeting={(s) => setVideoMeetingTargetSession(s)}
                onReschedule={(s) => setRescheduleTargetSession(s)}
                onCancel={(s) => setCancelTargetSession(s)}
                onAcceptReschedule={handleAcceptReschedule}
                onRejectReschedule={handleRejectReschedule}
                onConfirmCompletion={handleConfirmCompletion}
                onDisputeCompletion={handleDisputeCompletion}
                onMarkComplete={handleMarkComplete}
                onLeaveReview={(s) => setReviewTargetSession(s)}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && sessions.length === 0 && (
          <div className="mt-8">
            <EmptyState
              title="No sessions found"
              description={
                activeFilter === 'upcoming'
                  ? "You don't have any upcoming sessions scheduled."
                  : activeFilter === 'past'
                  ? "You haven't completed any sessions yet."
                  : 'No sessions recorded yet.'
              }
              actionLabel={availableSwaps.length > 0 ? "Schedule Your First Session" : undefined}
              onAction={availableSwaps.length > 0 ? () => setIsScheduleModalOpen(true) : undefined}
            />
          </div>
        )}
      </div>

      {/* Modals */}
      <ScheduleSessionModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        availableSwaps={availableSwaps}
      />

      <RescheduleModal
        isOpen={!!rescheduleTargetSession}
        onClose={() => setRescheduleTargetSession(null)}
        session={rescheduleTargetSession}
      />

      <CancelSessionModal
        isOpen={!!cancelTargetSession}
        onClose={() => setCancelTargetSession(null)}
        session={cancelTargetSession}
      />

      <VideoMeetingModal
        isOpen={!!videoMeetingTargetSession}
        onClose={() => setVideoMeetingTargetSession(null)}
        session={videoMeetingTargetSession}
        onSessionUpdated={(updated) => setVideoMeetingTargetSession(updated)}
      />

      <ReviewModal
        isOpen={!!reviewTargetSession}
        onClose={() => setReviewTargetSession(null)}
        session={reviewTargetSession}
        onSuccess={() => setReviewTargetSession(null)}
      />
    </AppLayout>
  );
};

export default Sessions;
