import type { SwapRequestStatus } from '../../types/swapRequest';

interface RequestStatusBadgeProps {
  status: SwapRequestStatus;
}

const statusConfig: Record<
  SwapRequestStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  PENDING: {
    label: 'Pending',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
  },
  ACCEPTED: {
    label: 'Accepted',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    border: 'border-emerald-200',
  },
  REJECTED: {
    label: 'Declined',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    bg: 'bg-sky-50',
    text: 'text-sky-700',
    border: 'border-sky-200',
  },
  COMPLETED: {
    label: 'Completed',
    bg: 'bg-purple-50',
    text: 'text-purple-700',
    border: 'border-purple-200',
  },
  DISPUTED: {
    label: 'Disputed',
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
  },
};

export const RequestStatusBadge = ({ status }: RequestStatusBadgeProps) => {
  const config = statusConfig[status] || {
    label: status,
    bg: 'bg-slate-50',
    text: 'text-slate-600',
    border: 'border-slate-200',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.bg} ${config.text} ${config.border}`}
    >
      {config.label}
    </span>
  );
};

export default RequestStatusBadge;

