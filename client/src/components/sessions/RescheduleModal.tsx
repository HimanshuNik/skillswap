import { useState } from 'react';
import { useProposeReschedule } from '../../hooks/useSessions';
import type { SessionWithDetails } from '../../types/session';
import { Modal } from '../ui/Modal';

interface RescheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionWithDetails | null;
  onSuccess?: () => void;
}

export const RescheduleModal = ({
  isOpen,
  onClose,
  session,
  onSuccess,
}: RescheduleModalProps) => {
  const proposeMutation = useProposeReschedule();

  const getInitialDateTime = () => {
    if (!session) return { initialDate: '', initialTime: '', initialDuration: 60 };
    const currentStart = new Date(session.scheduledStart || session.scheduledAt || Date.now() + 86400000);
    const currentOrTomorrow = currentStart.getTime() > Date.now() ? currentStart : new Date(Date.now() + 86400000);
    return {
      initialDate: currentOrTomorrow.toISOString().split('T')[0],
      initialTime: `${String(currentOrTomorrow.getHours()).padStart(2, '0')}:${String(currentOrTomorrow.getMinutes()).padStart(2, '0')}`,
      initialDuration: session.duration || 60,
    };
  };

  const [date, setDate] = useState(() => getInitialDateTime().initialDate);
  const [time, setTime] = useState(() => getInitialDateTime().initialTime);
  const [duration, setDuration] = useState<number>(() => getInitialDateTime().initialDuration);
  const [reason, setReason] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const [lastSessionId, setLastSessionId] = useState<number | null>(null);
  if (session && lastSessionId !== session.id) {
    setLastSessionId(session.id);
    const { initialDate, initialTime, initialDuration } = getInitialDateTime();
    setDate(initialDate);
    setTime(initialTime);
    setDuration(initialDuration);
    setReason('');
    setErrorText(null);
  }

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!date || !time) {
      setErrorText('Please specify both a proposed date and time.');
      return;
    }

    const proposedDate = new Date(`${date}T${time}:00`);
    if (isNaN(proposedDate.getTime())) {
      setErrorText('Invalid date or time format.');
      return;
    }

    if (proposedDate.getTime() <= Date.now()) {
      setErrorText('Proposed date and time must be in the future.');
      return;
    }

    try {
      await proposeMutation.mutateAsync({
        id: session.id,
        payload: {
          proposedStart: proposedDate.toISOString(),
          duration,
          reason: reason.trim() || undefined,
        },
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Failed to propose reschedule.');
    }
  };

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Propose New Time"
      description={`Request to reschedule your session on ${session.skill.name}.`}
      maxWidth="md"
    >
      {errorText && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="reschedule-date" className="block text-sm font-semibold text-slate-900">New Date</label>
            <input
              id="reschedule-date"
              type="date"
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          <div>
            <label htmlFor="reschedule-time" className="block text-sm font-semibold text-slate-900">New Time</label>
            <input
              id="reschedule-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>
        </div>

        <div>
          <label htmlFor="reschedule-duration" className="block text-sm font-semibold text-slate-900">Duration</label>
          <select
            id="reschedule-duration"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
          >
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>60 minutes (1 hour)</option>
            <option value={90}>90 minutes (1.5 hours)</option>
            <option value={120}>120 minutes (2 hours)</option>
          </select>
        </div>

        <div>
          <label htmlFor="reschedule-reason" className="block text-sm font-semibold text-slate-900">
            Reason for Rescheduling
          </label>
          <textarea
            id="reschedule-reason"
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Schedule conflict arose, could we do later this week?"
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
            disabled={proposeMutation.isPending}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {proposeMutation.isPending ? 'Proposing...' : 'Propose Reschedule'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
