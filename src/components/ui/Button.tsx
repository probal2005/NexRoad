import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'danger'

type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  fullWidth?: boolean
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-green text-brand-navy hover:bg-emerald-300 shadow-sm shadow-emerald-500/10',
  secondary:
    'bg-brand-navy text-white hover:bg-slate-800',
  outline:
    'border border-slate-300 bg-white text-brand-navy hover:bg-slate-50',
  ghost:
    'bg-transparent text-brand-navy hover:bg-slate-100',
  danger:
    'bg-red-600 text-white hover:bg-red-700',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-xs',
  md: 'min-h-11 px-5 text-sm',
  lg: 'min-h-13 px-7 text-base',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  disabled,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-xl',
        'font-semibold transition-all duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
        'disabled:pointer-events-none disabled:opacity-50',
        'active:scale-[0.98]',
        variants[variant],
        sizes[size],
        fullWidth ? 'w-full' : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {loading ? (
        <LoaderCircle size={17} className="animate-spin" />
      ) : (
        leftIcon
      )}

      {children}

      {!loading && rightIcon}
    </button>
  )
}
