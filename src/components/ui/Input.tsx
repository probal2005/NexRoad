import type { InputHTMLAttributes, ReactNode } from 'react'

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string
  error?: string
  helperText?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export default function Input({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? props.name

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={inputId}
          className="mb-2 block text-sm font-semibold text-brand-navy"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>
      )}

      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            {leftIcon}
          </span>
        )}

        <input
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined
          }
          className={[
            'min-h-12 w-full rounded-xl border bg-white px-4 py-3',
            'text-sm text-brand-navy placeholder:text-slate-400',
            'transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10',
            'disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400',
            leftIcon ? 'pl-11' : '',
            rightIcon ? 'pr-11' : '',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
              : 'border-slate-200',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        />

        {rightIcon && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-slate-400">
            {rightIcon}
          </span>
        )}
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={`${inputId}-helper`} className="mt-2 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
