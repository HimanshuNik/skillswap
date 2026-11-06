import React from 'react';
import { Link } from 'react-router-dom';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  secondaryActionHref?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  secondaryActionHref,
  onSecondaryAction,
  className = '',
}) => {
  return (
    <div
      className={`rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs sm:p-12 ${className}`}
    >
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-2xl text-emerald-600 sm:h-16 sm:w-16">
        {icon || '✨'}
      </div>

      <h3 className="mt-4 text-base font-bold text-slate-950 sm:text-lg">
        {title}
      </h3>

      <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-slate-500 sm:text-sm">
        {description}
      </p>

      {((actionLabel && (actionHref || onAction)) || (secondaryActionLabel && (secondaryActionHref || onSecondaryAction))) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && (
            actionHref ? (
              <Link
                to={actionHref}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
              >
                {actionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onAction}
                className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
              >
                {actionLabel}
              </button>
            )
          )}

          {secondaryActionLabel && (
            secondaryActionHref ? (
              <Link
                to={secondaryActionHref}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
              >
                {secondaryActionLabel}
              </Link>
            ) : (
              <button
                type="button"
                onClick={onSecondaryAction}
                className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500 sm:text-sm"
              >
                {secondaryActionLabel}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
};
