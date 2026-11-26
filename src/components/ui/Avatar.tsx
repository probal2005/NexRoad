import { useState } from 'react'

type AvatarProps = {
  name: string
  src?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

export default function Avatar({
  name,
  src,
  size = 'md',
  className = '',
}: AvatarProps) {
  const [imageFailed, setImageFailed] = useState(false)

  const showImage = Boolean(src) && !imageFailed

  return (
    <div
      className={[
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-emerald-100 font-bold text-emerald-800',
        sizes[size],
        className,
      ].filter(Boolean).join(' ')}
      role="img"
      aria-label={name}
    >
      {showImage ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        getInitials(name) || '?'
      )}
    </div>
  )
}
