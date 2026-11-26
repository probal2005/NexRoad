import { useLayoutEffect, useId, useRef, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import Button from './Button'

type ConfirmDialogProps = {
  open: boolean
  title: string
  description: string
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'primary' | 'danger'
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const id = useId()
  const dialogRef = useRef<HTMLDialogElement>(null)

  useLayoutEffect(() => {
    const dialog = dialogRef.current
    if (!open || !dialog) return
    const previousFocus = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus()
    }
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={dialogRef}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-description`}
      onCancel={(event) => {
        event.preventDefault()
        if (!loading) onClose()
      }}
      onClick={(event) => {
        if (loading || event.target !== event.currentTarget) return
        const { left, right, top, bottom } = event.currentTarget.getBoundingClientRect()
        if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) onClose()
      }}
      className="fixed inset-0 m-auto max-h-[calc(100dvh-2rem)] w-[92vw] max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl backdrop:bg-slate-950/50 backdrop:backdrop-blur-sm"
    >
      <div className="flex items-start justify-between">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
          <AlertTriangle size={24} />
        </div>

        <button
          type="button"
          aria-label="Close dialog"
          disabled={loading}
          onClick={onClose}
          className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X size={19} />
        </button>
      </div>

      <h2
        id={`${id}-title`}
        className="mt-5 text-xl font-extrabold text-brand-navy"
      >
        {title}
      </h2>

      <p
        id={`${id}-description`}
        className="mt-3 text-sm leading-7 text-slate-600"
      >
        {description}
      </p>

      {children && <div className="mt-4">{children}</div>}

      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={loading}
          onClick={onClose}
        >
          {cancelLabel}
        </Button>

        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          loading={loading}
          onClick={onConfirm}
        >
          {confirmLabel}
        </Button>
      </div>
    </dialog>
  )
}
