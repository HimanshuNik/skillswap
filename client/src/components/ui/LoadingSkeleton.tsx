import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'rectangular' | 'circular' | 'text';
  width?: string | number;
  height?: string | number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
}) => {
  const variantStyles = {
    rectangular: 'rounded-2xl',
    circular: 'rounded-full',
    text: 'rounded-md h-4 w-full',
  }[variant];

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      role="status"
      aria-label="Loading content"
      style={style}
      className={`animate-pulse bg-slate-200/80 ${variantStyles} ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export const CardSkeleton: React.FC<{ className?: string; count?: number }> = ({
  className = '',
  count = 1,
}) => {
  const renderSingle = (key: number | string) => (
    <div
      key={key}
      role="status"
      aria-label="Loading card"
      className={`rounded-2xl border border-slate-200 bg-white p-6 shadow-xs ${className}`}
    >
      <div className="flex items-center gap-4">
        <LoadingSkeleton variant="circular" className="h-12 w-12 shrink-0" />
        <div className="min-w-0 flex-1 space-y-2">
          <LoadingSkeleton className="h-4 w-1/3" />
          <LoadingSkeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <LoadingSkeleton className="h-3 w-full" />
        <LoadingSkeleton className="h-3 w-4/5" />
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );

  if (count <= 1) {
    return renderSingle('single');
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => renderSingle(i))}
    </div>
  );
};
