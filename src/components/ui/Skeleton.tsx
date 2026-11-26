import type { HTMLAttributes } from 'react'

type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string
  height?: string
}

const variants = {
  text: 'rounded-md',
  circular: 'rounded-full',
  rectangular: 'rounded-xl',
}

export default function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  ...props
}: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={[
        'animate-pulse bg-slate-200',
        variants[variant],
        className,
      ].filter(Boolean).join(' ')}
      style={{ width, height }}
      {...props}
    />
  )
}
