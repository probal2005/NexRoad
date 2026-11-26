import type { SubmitEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Input from '../ui/Input'

export default function AdminFuelPrices({ adminId }: { adminId: string | undefined }) {
  const client = useQueryClient()
  const key = ['admin-fuel-prices', adminId]
  const prices = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('admin_fuel_prices').abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const save = useMutation({
    mutationFn: async ({ type, price }: { type: string; price: number }) => {
      const { data, error } = await supabase.rpc('admin_set_fuel_price', { p_fuel_type: type, p_unit_price_inr: price })
      if (error) throw error
      if (!data) throw new Error('Rate rejected')
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: key }),
      client.invalidateQueries({ queryKey: ['admin-overview', adminId] }),
    ]),
  })

  function submit(event: SubmitEvent<HTMLFormElement>, type: string) {
    event.preventDefault()
    if (save.isPending) return
    save.mutate({ type, price: Number(new FormData(event.currentTarget).get('price')) })
  }

  return (
    <div className="@container space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
      <h3 className="font-bold text-brand-navy">Fuel prices per litre</h3>
      {prices.isPending && <p role="status" className="text-sm text-slate-600">Loading fuel prices…</p>}
      {prices.isError && <Alert variant="warning" title="Fuel price settings are unavailable." />}
      {save.isError && <Alert variant="error" title="Could not save the fuel price." />}
      {save.isSuccess && <Alert variant="success" title="Fuel price saved." />}
      <div className="grid gap-3 @lg:grid-cols-2">
        {prices.data?.map(({ fuel_type, unit_price_inr }) => (
          <form key={fuel_type} aria-label={`Edit ${fuel_type} price`} className="min-w-0 space-y-3 rounded-lg border border-slate-200 bg-white p-3"
            onSubmit={(event) => submit(event, fuel_type)}>
            <Input name="price" id={`fuel-price-${fuel_type}`} label={`${fuel_type === 'petrol' ? 'Petrol' : 'Diesel'} (₹/L)`}
              type="number" min="0.01" max="999999.99" step="0.01" required defaultValue={unit_price_inr} />
            <Button type="submit" variant="outline" size="sm" disabled={save.isPending}>Save {fuel_type} price</Button>
          </form>
        ))}
      </div>
    </div>
  )
}
