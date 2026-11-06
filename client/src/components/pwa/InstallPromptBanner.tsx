import React, { useState } from 'react';
import { Download, X, Share } from 'lucide-react';
import { usePWA } from '../../hooks/usePWA';

export const InstallPromptBanner: React.FC = () => {
  const { canInstall, isStandalone, isIOS, installApp, dismissInstall } = usePWA();
  const [showIosGuide, setShowIosGuide] = useState(false);

  // If already running standalone or cannot install, hide
  if (isStandalone || (!canInstall && !isIOS)) {
    return null;
  }

  return (
    <div className="relative mb-4 flex flex-col items-start justify-between gap-3 rounded-2xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 to-purple-50/90 p-4 shadow-xs dark:border-indigo-900/40 dark:from-indigo-950/40 dark:to-purple-950/40 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
          <Download className="h-5 w-5" />
        </div>
        <div>
          <h4 className="text-xs font-bold text-slate-900 dark:text-white">
            Install SkillSwap App
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Enjoy full-screen learning, faster navigation, and offline access directly from your device.
          </p>
        </div>
      </div>

      <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
        {canInstall ? (
          <button
            type="button"
            onClick={installApp}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" /> Install App
          </button>
        ) : isIOS ? (
          <button
            type="button"
            onClick={() => setShowIosGuide(!showIosGuide)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-indigo-700 cursor-pointer"
          >
            <Share className="h-3.5 w-3.5" /> How to Install
          </button>
        ) : null}

        <button
          type="button"
          onClick={dismissInstall}
          aria-label="Dismiss install prompt"
          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/60 hover:text-slate-600 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {showIosGuide && (
        <div className="mt-2 w-full rounded-xl border border-indigo-200 bg-white p-3 text-xs text-slate-700 shadow-xs dark:border-indigo-800 dark:bg-slate-900 dark:text-slate-300">
          <p className="font-semibold text-indigo-600 dark:text-indigo-400">
            To install on iPhone or iPad:
          </p>
          <ol className="mt-1.5 list-decimal pl-4 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
            <li>Tap the <strong>Share</strong> button at the bottom of Safari.</li>
            <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
            <li>Tap <strong>Add</strong> in the top-right corner.</li>
          </ol>
        </div>
      )}
    </div>
  );
};

