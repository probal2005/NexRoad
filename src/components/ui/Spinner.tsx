import { LoaderCircle } from 'lucide-react'

type SpinnerProps = {
  size?: 'sm' | 'md' | 'lg'
  label?: string
  fullScreen?: boolean
}

const sizes = {
  sm: 16,
  md: 24,
  lg: 36,
}

export default function Spinner({
  size = 'md',
  label = 'Loading...',
  fullScreen = false,
}: SpinnerProps) {
  const content = (
    <div
      role="status"
      aria-label={label}
      className="inline-flex items-center gap-3 text-sm font-medium text-slate-600"
    >
      <LoaderCircle
        size={sizes[size]}
        className="animate-spin text-emerald-600"
      />
      <span>{label}</span>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-brand-light">
        {content}
      </div>
    )
  }

  return content
}
