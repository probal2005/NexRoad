import { useId, useState, type SubmitEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { SlidersHorizontal } from 'lucide-react'
import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import Input from '../ui/Input'
import StatusBadge from '../ui/StatusBadge'

type ServiceFields = Pick<Database['public']['Tables']['technician_services']['Row'],
  'category_id' | 'base_price' | 'service_charge' | 'per_km_charge' | 'is_active'>

const serviceFields = 'category_id, base_price, service_charge, per_km_charge, is_active'

const rateFields = [
  ['base_price', 'Base price (₹)'],
  ['service_charge', 'Service charge (₹)'],
  ['per_km_charge', 'Distance charge (₹/km)'],
] as const

function ServiceEditor({ caption, categoryId, service, technicianId }: {
  caption: string
  categoryId: string
  service?: ServiceFields
  technicianId: string
}) {
  const id = useId()
  const client = useQueryClient()
  const [invalid, setInvalid] = useState(false)
  const save = useMutation({
    mutationFn: async (values: ServiceFields) => {
      const { data, error } = await supabase.from('technician_services')
        .upsert({ technician_id: technicianId, ...values }, { onConflict: 'technician_id,category_id' })
        .select(serviceFields).single()
      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      client.setQueryData<ServiceFields[]>(['technician-services', technicianId], (previous) => [
        ...(previous ?? []).filter((item) => item.category_id !== data.category_id),
        data,
      ])
    },
  })

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (save.isPending) return
    const form = new FormData(event.currentTarget)
    const rates = rateFields.map(([name]) => String(form.get(name) ?? '').trim())
    const [basePrice, serviceCharge, distanceCharge] = rates.map(Number)
    if (rates.some((rate) => !/^\d+(\.\d{1,2})?$/.test(rate) || !Number.isFinite(Number(rate)))) {
      setInvalid(true)
      return
    }

    setInvalid(false)
    save.mutate({
      category_id: categoryId,
      base_price: basePrice,
      service_charge: serviceCharge,
      per_km_charge: distanceCharge,
      is_active: form.has('listed'),
    })
  }

  return (
    <form aria-label={caption} className="@container space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4" onSubmit={submit}
      onChange={() => {
        setInvalid(false)
        if (save.isSuccess || save.isError) save.reset()
      }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-bold text-brand-navy">{caption}</h3>
        <StatusBadge status={service?.is_active ? 'available' : 'offline'}
          label={service?.is_active ? 'Listed' : 'Not listed'} />
      </div>
      <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
        <input name="listed" type="checkbox" defaultChecked={service?.is_active ?? false}
          disabled={save.isPending} className="size-4 shrink-0 accent-emerald-700" />
        Offer this service
      </label>
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold text-brand-navy">Pricing in INR</legend>
        <div className="grid gap-3 @lg:grid-cols-3">
          {rateFields.map(([field, label]) => (
            <Input key={field} id={`${id}-${field}`} name={field} label={label}
              type="number" min="0" step="0.01" required disabled={save.isPending} defaultValue={service?.[field] ?? 0} />
          ))}
        </div>
      </fieldset>
      {invalid && <Alert variant="error" title="Enter non-negative rates with up to two decimal places." />}
      {save.isError && <Alert variant="error" title="Could not save these rates. Please try again." />}
      {save.isSuccess && <Alert variant="success" title="Service rates saved." />}
      <Button type="submit" className="w-full @sm:w-auto" loading={save.isPending}>Save service</Button>
    </form>
  )
}

export default function TechnicianServices({ technicianId }: { technicianId: string }) {
  const categories = useQuery({
    queryKey: ['technician-service-categories'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('service_categories')
        .select('id, name').eq('is_active', true).order('name').abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const services = useQuery({
    queryKey: ['technician-services', technicianId],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('technician_services')
        .select(serviceFields).eq('technician_id', technicianId).abortSignal(signal)
      if (error) throw error
      return data
    },
  })

  return (
    <Card padding="sm" className="space-y-4 sm:p-5">
      <h2 className="flex items-center gap-3 text-xl font-bold text-brand-navy">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sky-100 text-sky-800"><SlidersHorizontal size={18} aria-hidden /></span>
        Services and rates
      </h2>
      <p className="text-sm text-slate-600">List the services you offer and set their rates in INR.</p>
      {(categories.isPending || services.isPending) && <p role="status" className="text-sm text-slate-600">Loading services…</p>}
      {(categories.isError || services.isError) && (
        <Alert variant="error" title="Could not load service settings.">
          <Button size="sm" variant="outline" onClick={() => void Promise.all([categories.refetch(), services.refetch()])}>Retry services</Button>
        </Alert>
      )}
      {categories.isSuccess && services.isSuccess && (categories.data.length
        ? categories.data.map((category) => (
          <ServiceEditor key={category.id} caption={category.name} categoryId={category.id}
            service={services.data.find((item) => item.category_id === category.id)} technicianId={technicianId} />
        ))
        : <p className="text-sm text-slate-600">No service categories are currently available.</p>)}
    </Card>
  )
}
