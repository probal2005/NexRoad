import type { ReactNode } from 'react'
import { Inbox } from 'lucide-react'
import Button from './Button'

type EmptyStateProps = {
  title: string
  description: string
  icon?: ReactNode
  actionLabel?: string
  onAction?: () => void
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
        {icon ?? <Inbox size={30} />}
      </div>

      <h3 className="text-lg font-bold text-brand-navy">
        {title}
      </h3>

      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          className="mt-6"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
