import type { ButtonHTMLAttributes, ReactNode } from 'react'

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: ReactNode
  label: string
  variant?: 'default' | 'primary' | 'danger'
  size?: 'sm' | 'md' | 'lg'
}

const variants = {
  default: 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200',
  primary: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  danger: 'bg-red-50 text-red-600 hover:bg-red-100',
}

const sizes = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
}

export default function IconButton({
  icon,
  label,
  variant = 'default',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={[
        'inline-flex shrink-0 items-center justify-center rounded-xl',
        'transition-colors duration-200',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {icon}
    </button>
  )
}
