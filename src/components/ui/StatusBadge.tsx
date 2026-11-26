import type { HTMLAttributes } from 'react'

export type StatusType =
  | 'pending'
  | 'accepted'
  | 'active'
  | 'completed'
  | 'cancelled'
  | 'rejected'
  | 'verified'
  | 'unverified'
  | 'paid'
  | 'failed'
  | 'offline'
  | 'available'

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  status: StatusType
  label?: string
  dot?: boolean
}

const statusStyles: Record<StatusType, string> = {
  pending: 'bg-amber-50 text-amber-700 ring-amber-200',
  accepted: 'bg-blue-50 text-blue-700 ring-blue-200',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  completed: 'bg-green-50 text-green-700 ring-green-200',
  cancelled: 'bg-slate-100 text-slate-600 ring-slate-200',
  rejected: 'bg-red-50 text-red-700 ring-red-200',
  verified: 'bg-green-50 text-green-700 ring-green-200',
  unverified: 'bg-amber-50 text-amber-700 ring-amber-200',
  paid: 'bg-green-50 text-green-700 ring-green-200',
  failed: 'bg-red-50 text-red-700 ring-red-200',
  offline: 'bg-slate-100 text-slate-600 ring-slate-200',
  available: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

const defaultLabels: Record<StatusType, string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  active: 'Active',
  completed: 'Completed',
  cancelled: 'Cancelled',
  rejected: 'Rejected',
  verified: 'Verified',
  unverified: 'Unverified',
  paid: 'Paid',
  failed: 'Failed',
  offline: 'Offline',
  available: 'Available',
}

export default function StatusBadge({
  status,
  label,
  dot = true,
  className = '',
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={[
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5',
        'text-xs font-bold ring-1 ring-inset',
        statusStyles[status],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {dot && (
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
      )}

      {label ?? defaultLabels[status]}
    </span>
  )
}
