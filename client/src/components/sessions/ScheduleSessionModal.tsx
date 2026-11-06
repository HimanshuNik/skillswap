import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useCreateSession } from '../../hooks/useSessions';
import { useAuthStore } from '../../store/useAuthStore';
import type { SessionWithDetails } from '../../types/session';
import { Modal } from '../ui/Modal';
import { aiApi, type SmartScheduleSuggestion } from '../../lib/aiApi';
import { Sparkles, Clock } from 'lucide-react';

interface SwapOption {
  id: number;
  partnerName: string;
  partnerId: number;
  myTeachingSkillId: number;
  myTeachingSkillName: string;
  theirTeachingSkillId: number;
  theirTeachingSkillName: string;
}

interface ScheduleSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableSwaps?: SwapOption[];
  preselectedSwapId?: number;
  onSuccess?: (session: SessionWithDetails) => void;
}

export const ScheduleSessionModal = ({
  isOpen,
  onClose,
  availableSwaps = [],
  preselectedSwapId,
  onSuccess,
}: ScheduleSessionModalProps) => {
  const { user } = useAuthStore();
  const createMutation = useCreateSession();

  const getTomorrowIso = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  };

  const [selectedSwapId, setSelectedSwapId] = useState<number>(0);
  const [direction, setDirection] = useState<'i_teach' | 'they_teach'>('i_teach');
  const [date, setDate] = useState(getTomorrowIso);
  const [time, setTime] = useState('10:00');
  const [duration, setDuration] = useState<number>(60);
  const [notes, setNotes] = useState('');
  const [errorText, setErrorText] = useState<string | null>(null);

  const effectiveSwapId = selectedSwapId || preselectedSwapId || (availableSwaps.length > 0 ? availableSwaps[0].id : 0);
  const currentSwap = availableSwaps.find((s) => s.id === effectiveSwapId);

  const { data: suggestionsData, isLoading: isLoadingSuggestions } = useQuery({
    queryKey: ['smart-schedule', currentSwap?.partnerId, duration],
    queryFn: async () => {
      if (!currentSwap?.partnerId) return [];
      const res = await aiApi.getSchedulingSuggestions(currentSwap.partnerId, duration);
      return res.data?.suggestions || [];
    },
    enabled: isOpen && !!currentSwap?.partnerId,
  });

  const smartSuggestions = suggestionsData || [];

  const handleApplySuggestion = (s: SmartScheduleSuggestion) => {
    setDate(s.date);
    const d = new Date(s.startTimeIso);
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    setTime(`${hours}:${minutes}`);
  };

  const handleClose = () => {
    setSelectedSwapId(0);
    setDirection('i_teach');
    setDate(getTomorrowIso());
    setTime('10:00');
    setDuration(60);
    setNotes('');
    setErrorText(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    if (!currentSwap || !user) {
      setErrorText('Please select an active skill swap agreement.');
      return;
    }

    if (!date || !time) {
      setErrorText('Please select both a date and a start time.');
      return;
    }

    const scheduledDate = new Date(`${date}T${time}:00`);
    if (isNaN(scheduledDate.getTime())) {
      setErrorText('Invalid date or time entered.');
      return;
    }

    if (scheduledDate.getTime() <= Date.now()) {
      setErrorText('The scheduled start time must be in the future.');
      return;
    }

    const teacherId = direction === 'i_teach' ? user.id : currentSwap.partnerId;
    const learnerId = direction === 'i_teach' ? currentSwap.partnerId : user.id;
    const skillId =
      direction === 'i_teach'
        ? currentSwap.myTeachingSkillId
        : currentSwap.theirTeachingSkillId;

    try {
      const session = await createMutation.mutateAsync({
        swapRequestId: currentSwap.id,
        teacherId,
        learnerId,
        skillId,
        scheduledStart: scheduledDate.toISOString(),
        duration,
        notes: notes.trim() || undefined,
      });

      onSuccess?.(session);
      handleClose();
    } catch (err: unknown) {
      setErrorText(err instanceof Error ? err.message : 'Failed to schedule session.');
    }
  };

  const todayIso = new Date().toISOString().split('T')[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Schedule Learning Session"
      description="Set up a 1-on-1 video session with your swap partner."
      maxWidth="lg"
    >
      {errorText && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" role="alert">
          {errorText}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {availableSwaps.length > 1 && (
          <div>
            <label htmlFor="swap-agreement-select" className="block text-sm font-semibold text-slate-900">
              Swap Agreement
            </label>
            <select
              id="swap-agreement-select"
              value={selectedSwapId}
              onChange={(e) => setSelectedSwapId(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            >
              {availableSwaps.map((s) => (
                <option key={s.id} value={s.id}>
                  With {s.partnerName} ({s.myTeachingSkillName} ↔ {s.theirTeachingSkillName})
                </option>
              ))}
            </select>
          </div>
        )}

        {currentSwap && (
          <div>
            <span className="block text-sm font-semibold text-slate-900">
              Session Focus & Direction
            </span>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2" role="radiogroup" aria-label="Session Focus">
              <button
                type="button"
                role="radio"
                aria-checked={direction === 'i_teach'}
                onClick={() => setDirection('i_teach')}
                className={`rounded-xl border p-3 text-left transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  direction === 'i_teach'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
                  You Teach
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {currentSwap.myTeachingSkillName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">To {currentSwap.partnerName}</p>
              </button>

              <button
                type="button"
                role="radio"
                aria-checked={direction === 'they_teach'}
                onClick={() => setDirection('they_teach')}
                className={`rounded-xl border p-3 text-left transition focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  direction === 'they_teach'
                    ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-700">
                  You Learn
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {currentSwap.theirTeachingSkillName}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">From {currentSwap.partnerName}</p>
              </button>
            </div>
          </div>
        )}

        {/* Smart Scheduling Suggestions */}
        {currentSwap && (
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3.5">
            <div className="flex items-center justify-between text-xs font-bold text-emerald-950 mb-2">
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                AI Smart Recommended Times
              </span>
              {isLoadingSuggestions && (
                <span className="text-[11px] font-normal text-slate-400">Finding mutual slots...</span>
              )}
            </div>

            {smartSuggestions.length > 0 ? (
              <div className="space-y-1.5">
                {smartSuggestions.slice(0, 3).map((s, idx) => {
                  const isSelected = date === s.date;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplySuggestion(s)}
                      className={`w-full rounded-xl border p-2 text-left transition flex items-center justify-between text-xs ${
                        isSelected
                          ? 'border-emerald-500 bg-white shadow-sm ring-1 ring-emerald-500'
                          : 'border-emerald-200/60 bg-white/80 hover:bg-white'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Clock className="h-3.5 w-3.5 text-emerald-600" />
                        <div>
                          <span className="font-bold text-slate-900">{s.dayOfWeek}, {s.date}</span>
                          <span className="text-slate-500 ml-1.5">
                            {s.userLocalTime} (Yours) / {s.partnerLocalTime} ({currentSwap.partnerName})
                          </span>
                        </div>
                      </div>
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                        {s.confidenceScore}% Match
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : !isLoadingSuggestions ? (
              <p className="text-xs text-slate-500">
                Pick any mutual day from preferences or set a custom time below.
              </p>
            ) : null}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="session-date-input" className="block text-sm font-semibold text-slate-900">Date</label>
            <input
              id="session-date-input"
              type="date"
              min={todayIso}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>

          <div>
            <label htmlFor="session-time-input" className="block text-sm font-semibold text-slate-900">Start Time</label>
            <input
              id="session-time-input"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition"
            />
          </div>
        </div>

        <div>
          <label htmlFor="session-duration-select" className="block text-sm font-semibold text-slate-900">Duration</label>
          <select
            id="session-duration-select"
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
          <label htmlFor="session-notes-input" className="block text-sm font-semibold text-slate-900">
            Session Agenda / Notes (Optional)
          </label>
          <textarea
            id="session-notes-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Focus on component lifecycle, hooks, and clean code examples..."
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
            disabled={createMutation.isPending || !currentSwap}
            className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 transition focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {createMutation.isPending ? 'Scheduling...' : 'Schedule Session'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
