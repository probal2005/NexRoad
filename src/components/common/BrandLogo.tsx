import type { HTMLAttributes } from 'react'

type BrandLogoProps = {
  size?: 'sm' | 'md' | 'lg'
  showTagline?: boolean
  dark?: boolean
  href?: string
} & Omit<HTMLAttributes<HTMLDivElement>, 'children'>

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
  ...props
}: BrandLogoProps) {
  return (
    <a
      href={href}
      aria-label="NexRoad home"
      className={[
        'inline-flex items-center gap-3',
        className,
      ].filter(Boolean).join(' ')}
    >
      <img
        src="/logo/nexroad-mark.svg"
        alt=""
        className={logoSizes[size]}
      />

      <div {...props}>
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
            DRIVE SAFE · GET HELP · GO FURTHER
          </span>
        )}
      </div>
    </a>
  )
}
