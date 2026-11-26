import type { ReactNode } from 'react'
import {
  CheckCircle2,
  Info,
  AlertTriangle,
  XCircle,
  X,
} from 'lucide-react'

type AlertVariant = 'success' | 'info' | 'warning' | 'error'

type AlertProps = {
  variant?: AlertVariant
  title: string
  children?: ReactNode
  onClose?: () => void
}

const variants = {
  success: {
    styles: 'border-green-200 bg-green-50 text-green-800',
    icon: CheckCircle2,
  },
  info: {
    styles: 'border-blue-200 bg-blue-50 text-blue-800',
    icon: Info,
  },
  warning: {
    styles: 'border-amber-200 bg-amber-50 text-amber-800',
    icon: AlertTriangle,
  },
  error: {
    styles: 'border-red-200 bg-red-50 text-red-800',
    icon: XCircle,
  },
}

export default function Alert({
  variant = 'info',
  title,
  children,
  onClose,
}: AlertProps) {
  const config = variants[variant]
  const Icon = config.icon

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-3 rounded-xl border p-4 ${config.styles}`}
    >
      <Icon size={20} className="mt-0.5 shrink-0" />

      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold">
          {title}
        </h3>

        {children && (
          <div className="mt-1 text-sm leading-6 opacity-90">
            {children}
          </div>
        )}
      </div>

      {onClose && (
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={onClose}
          className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
        >
          <X size={17} />
        </button>
      )}
    </div>
  )
}
