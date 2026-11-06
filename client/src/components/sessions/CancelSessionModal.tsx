import { useState } from 'react';
import { useCancelSession } from '../../hooks/useSessions';
import type { SessionWithDetails } from '../../types/session';
import { Modal } from '../ui/Modal';

interface CancelSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: SessionWithDetails | null;
  onSuccess?: () => void;
}

export const CancelSessionModal = ({
  isOpen,
  onClose,
  session,
  onSuccess,
}: CancelSessionModalProps) => {
  const cancelMutation = useCancelSession();
  const [reason, setReason] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  if (!session) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (reason.trim().length < 3) {
      setErrorText('Please provide a reason of at least 3 characters.');
      return;
    }

    try {
      await cancelMutation.mutateAsync({
        id: session.id,
        reason: reason.trim(),
      });
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Failed to cancel session.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cancel Session"
      description={`Are you sure you want to cancel the ${session.skill.name} session?`}
      maxWidth="md"
    >
      {errorText && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="cancellation-reason" className="block text-sm font-semibold text-slate-900">
            Reason for Cancellation
          </label>
          <textarea
            id="cancellation-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            required
            placeholder="Please explain why you need to cancel this session..."
            className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-red-500 focus:ring-4 focus:ring-red-500/10 transition resize-none"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Keep Session
          </button>
          <button
            type="submit"
            disabled={cancelMutation.isPending}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 disabled:opacity-50 transition focus-visible:ring-2 focus-visible:ring-red-500"
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Confirm Cancellation'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
