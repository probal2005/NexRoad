import type { HTMLAttributes } from 'react'

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hover?: boolean
}

const paddingStyles = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({
  children,
  padding = 'md',
  hover = false,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={[
        'rounded-2xl border border-slate-200 bg-white',
        'shadow-sm shadow-slate-900/[0.03]',
        paddingStyles[padding],
        hover
          ? 'transition-all duration-200 hover:-translate-y-1 hover:shadow-lg hover:shadow-slate-900/[0.06]'
          : '',
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
