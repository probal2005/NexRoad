
import type { HTMLAttributes, ReactNode } from 'react'

type BrandWatermarkProps = {
  children: ReactNode
  className?: string
  variant?: 'default' | 'center' | 'small'
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

export default function BrandWatermark({
  children,
  className = '',
  variant = 'default',
  ...props
}: BrandWatermarkProps) {
  const variantClass =
    variant === 'center'
      ? 'brand-watermark--center'
      : variant === 'small'
        ? 'brand-watermark--small'
        : ''

  return (
    <div
      className={`brand-watermark ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
