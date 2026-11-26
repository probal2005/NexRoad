import type { TextareaHTMLAttributes } from 'react'

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string
  error?: string
  helperText?: string
}

export default function Textarea({
  label,
  error,
  helperText,
  id,
  className = '',
  ...props
}: TextareaProps) {
  const textareaId = id ?? props.name

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={textareaId}
          className="mb-2 block text-sm font-semibold text-brand-navy"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>
      )}

      <textarea
        id={textareaId}
        aria-invalid={Boolean(error)}
        aria-describedby={
          error
            ? `${textareaId}-error`
            : helperText
              ? `${textareaId}-helper`
              : undefined
        }
        className={[
          'min-h-32 w-full resize-y rounded-xl border bg-white px-4 py-3',
          'text-sm text-brand-navy placeholder:text-slate-400',
          'transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10',
          'disabled:cursor-not-allowed disabled:bg-slate-100',
          error ? 'border-red-400' : 'border-slate-200',
          className,
        ].filter(Boolean).join(' ')}
        {...props}
      />

      {error && (
        <p id={`${textareaId}-error`} role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={`${textareaId}-helper`} className="mt-2 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
