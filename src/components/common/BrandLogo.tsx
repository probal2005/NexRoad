import type { MouseEventHandler } from 'react'
import { Link } from 'react-router-dom'

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  dark?: boolean
  href?: string
  onClick?: MouseEventHandler<HTMLAnchorElement>
  className?: string
}

const logoSizes = {
  sm: 'h-9 w-9',
  md: 'h-11 w-11',
  lg: 'h-14 w-14',
}

export default function BrandLogo({
  size = 'md',
  showTagline = true,
  dark = false,
  href = '/',
  className = '',
  onClick,
}: BrandLogoProps) {
  return (
    <Link
      to={href}
      onClick={onClick}
      aria-label="NexRoad home"
      className={[
        'inline-flex items-center gap-2.5',
        className,
      ].filter(Boolean).join(' ')}
    >
      <img
        src="/logo/nexroad-road-pin.webp"
        alt=""
        className={`${logoSizes[size]} shrink-0`}
      />

      <div>
        <span
          className={[
            'block text-xl leading-tight font-extrabold tracking-tight',
            dark ? 'text-white' : 'text-brand-navy',
          ].join(' ')}
        >
          NexRoad
        </span>

        {showTagline && (
          <span
            className={[
              'mt-1 block text-[9px] font-bold tracking-[0.08em]',
              dark ? 'text-slate-400' : 'text-slate-500',
            ].join(' ')}
          >
            ROADSIDE ASSISTANCE
          </span>
        )}
      </div>
    </Link>
  )
}
