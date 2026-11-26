import type { HTMLAttributes } from 'react'

type ContainerProps = HTMLAttributes<HTMLDivElement> & {
  size?: 'md' | 'lg' | 'xl' | 'full'
}

const containerSizes = {
  md: 'max-w-4xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-none',
}

export default function Container({
  children,
  size = 'xl',
  className = '',
  ...props
}: ContainerProps) {
  return (
    <div
      className={[
        'mx-auto w-full px-5 sm:px-6 lg:px-8',
        containerSizes[size],
        className,
      ].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </div>
  )
}
