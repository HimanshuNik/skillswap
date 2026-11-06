import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data. Please try again.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      role="alert"
      className={`rounded-2xl border border-red-200 bg-red-50/60 p-6 text-center shadow-xs sm:p-8 ${className}`}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 sm:h-14 sm:w-14">
        <AlertCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      </div>

      <h3 className="mt-4 text-base font-bold text-red-950 sm:text-lg">
        {title}
      </h3>

      <p className="mx-auto mt-1 max-w-md text-xs text-red-800 sm:text-sm">
        {message}
      </p>

      {onRetry && (
        <div className="mt-5">
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-500 sm:text-sm"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
        </div>
      )}
    </div>
  );
};

