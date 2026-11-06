import React, { useState } from 'react';
import { Sparkles, RefreshCw, X } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const UpdateAvailableToast: React.FC = () => {
  const { hasUpdate, applyUpdate } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!hasUpdate || dismissed) {
    return null;
  }

  return (
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-indigo-200 bg-white p-3.5 shadow-xl transition-all dark:border-indigo-800 dark:bg-slate-900"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
        <Sparkles className="h-4 w-4" />
      </div>

      <div className="flex flex-col pr-2">
        <span className="text-xs font-bold text-slate-900 dark:text-white">
          Update Ready
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-400">
          A new version of SkillSwap is available.
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={applyUpdate}
          className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Reload</span>
        </button>

        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss update notification"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

