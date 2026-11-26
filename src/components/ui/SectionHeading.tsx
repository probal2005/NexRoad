type SectionHeadingProps = {
  eyebrow?: string
  title: string
  description?: string
  align?: 'left' | 'center'
  className?: string
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className = '',
}: SectionHeadingProps) {
  return (
    <div
      className={[
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className,
      ].filter(Boolean).join(' ')}
    >
      {eyebrow && (
        <p className="text-xs font-extrabold tracking-[0.18em] text-emerald-600">
          {eyebrow}
        </p>
      )}

      <h2 className="mt-3 text-3xl leading-tight font-extrabold tracking-tight text-brand-navy sm:text-4xl">
        {title}
      </h2>

      {description && (
        <p className="mt-4 text-base leading-7 text-slate-600">
          {description}
        </p>
      )}
    </div>
  )
}
