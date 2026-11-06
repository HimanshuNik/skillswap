import React from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';

export const NetworkStatusIndicator: React.FC = () => {
  const { isOnline, isReconnecting, retryConnection } = useNetworkStatus();

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-2xl border border-amber-300 bg-amber-50/95 px-4 py-3 shadow-lg backdrop-blur-xs transition-all dark:border-amber-700/50 dark:bg-amber-950/90"
    >
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
        <WifiOff className="h-4 w-4" />
      </div>

      <div className="flex flex-col">
        <span className="text-xs font-bold text-amber-900 dark:text-amber-100">
          You are currently offline
        </span>
        <span className="text-[11px] text-amber-700 dark:text-amber-300">
          Viewing cached content. Live sessions require internet.
        </span>
      </div>

      <button
        type="button"
        onClick={() => retryConnection()}
        disabled={isReconnecting}
        className="ml-2 inline-flex items-center gap-1.5 rounded-xl bg-amber-200/80 px-2.5 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-300/80 disabled:opacity-50 dark:bg-amber-900/60 dark:text-amber-100 dark:hover:bg-amber-800/80 cursor-pointer"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
        <span>{isReconnecting ? 'Checking...' : 'Retry'}</span>
      </button>
    </div>
  );
};

