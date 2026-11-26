import type { SelectHTMLAttributes } from 'react'
import { ChevronDown } from 'lucide-react'

type SelectOption = {
  label: string
  value: string
  disabled?: boolean
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string
  error?: string
  helperText?: string
  options: SelectOption[]
  placeholder?: string
}

export default function Select({
  label,
  error,
  helperText,
  options,
  placeholder = 'Select an option',
  id,
  className = '',
  ...props
}: SelectProps) {
  const selectId = id ?? props.name

  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={selectId}
          className="mb-2 block text-sm font-semibold text-brand-navy"
        >
          {label}
          {props.required && (
            <span className="ml-1 text-red-500">*</span>
          )}
        </label>
      )}

      <div className="relative">
        <select
          id={selectId}
          aria-invalid={Boolean(error)}
          aria-describedby={
            error
              ? `${selectId}-error`
              : helperText
                ? `${selectId}-helper`
                : undefined
          }
          className={[
            'min-h-12 w-full appearance-none rounded-xl border bg-white px-4 py-3 pr-11',
            'text-sm text-brand-navy',
            'transition-colors focus:border-emerald-500 focus:outline-none focus:ring-4 focus:ring-emerald-500/10',
            'disabled:cursor-not-allowed disabled:bg-slate-100',
            error ? 'border-red-400' : 'border-slate-200',
            className,
          ].filter(Boolean).join(' ')}
          {...props}
        >
          <option value="">{placeholder}</option>

          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        <ChevronDown
          size={17}
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-slate-400"
        />
      </div>

      {error && (
        <p id={`${selectId}-error`} role="alert" className="mt-2 text-xs font-medium text-red-600">
          {error}
        </p>
      )}

      {!error && helperText && (
        <p id={`${selectId}-helper`} className="mt-2 text-xs text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  )
}
