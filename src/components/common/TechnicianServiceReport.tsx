import { useId, type SubmitEvent } from 'react'

import type { Json } from '../../lib/database.types'
import Button from '../ui/Button'
import Input from '../ui/Input'
import Select from '../ui/Select'
import Textarea from '../ui/Textarea'

const outcomes = [
  { value: 'roadside_repair', label: 'Repaired roadside' },
  { value: 'garage_required', label: 'Garage required' },
  { value: 'towing_required', label: 'Towing required' },
]

export default function TechnicianServiceReport({ service, bookedLitres, pending, onSubmit }: {
  service: string | undefined
  bookedLitres?: number | null
  pending: boolean
  onSubmit: (report: Json) => void
}) {
  const id = useId()
  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const summary = String(form.get('summary') ?? '').trim()
    if (summary.length < 3) return
    onSubmit({
      summary,
      fuel_litres: service === 'fuel' ? Number(form.get('fuel_litres')) : null,
      drop_off: service === 'towing' ? String(form.get('drop_off') ?? '').trim() : null,
      mechanical_outcome: service === 'mechanical' ? String(form.get('mechanical_outcome') ?? '') : null,
    })
  }

  if (!service) return <p className="text-sm text-slate-600">Service category unavailable. Refresh the job before submitting a report.</p>

  return (
    <form aria-label="Service report" className="space-y-3" onSubmit={submit}>
      {service === 'fuel' && <Input id={`${id}-fuel`} name="fuel_litres" label="Fuel delivered (litres)"
        type="number" step="0.01" min={1} max={50} required defaultValue={bookedLitres ?? undefined} readOnly={bookedLitres != null} />}
      {service === 'towing' && <Input id={`${id}-drop`} name="drop_off" label="Completed drop-off" required minLength={3} maxLength={500} />}
      {service === 'mechanical' && <Select id={`${id}-outcome`} name="mechanical_outcome" label="Mechanical outcome" required options={outcomes} />}
      <Textarea id={`${id}-summary`} name="summary" label="Service summary" required minLength={3} maxLength={1000} rows={3} />
      <Button type="submit" size="sm" loading={pending}>Send service report</Button>
    </form>
  )
}
