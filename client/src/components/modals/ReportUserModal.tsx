import React, { useState } from 'react';
import { adminApi } from '../../lib/adminApi';
import { ShieldAlert, X, CheckCircle2 } from 'lucide-react';

interface ReportUserModalProps {
  reportedUserId: number;
  reportedUserName: string;
  isOpen: boolean;
  onClose: () => void;
  targetType?: 'USER' | 'REVIEW' | 'MESSAGE' | 'SESSION';
  targetId?: number | null;
}

export const ReportUserModal: React.FC<ReportUserModalProps> = ({
  reportedUserId,
  reportedUserName,
  isOpen,
  onClose,
  targetType = 'USER',
  targetId = null,
}) => {
  const [category, setCategory] = useState('HARASSMENT');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setErrorMsg('Please describe the issue in at least 5 characters');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      await adminApi.submitReport({
        reportedId: reportedUserId,
        targetType,
        targetId,
        category,
        reason: reason.trim(),
      });
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        onClose();
      }, 2500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit report. Please try again.';
      setErrorMsg(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-rose-400">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-white text-base">Report Member</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-white text-base">Report Submitted</h4>
            <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
              Thank you for keeping SkillSwap safe. Our moderation team has received your report and will review it promptly.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-xs text-slate-300 leading-relaxed">
              Submit a confidential report regarding <strong className="text-white">{reportedUserName}</strong>. Our moderation team investigates all community guideline violations.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Category of Violation</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="HARASSMENT">Harassment or Abusive Behavior</option>
                <option value="SPAM">Spam or Unsolicited Commercial Messaging</option>
                <option value="INAPPROPRIATE">Inappropriate Content / Behavior</option>
                <option value="NO_SHOW">Repeated Session No-Show</option>
                <option value="FRAUD">Fraud or Impersonation</option>
                <option value="OTHER">Other Community Policy Infraction</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Detailed Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe what occurred, including context, dates, or chat messages..."
                rows={4}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {errorMsg}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
