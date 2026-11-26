import { useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Database } from '../../lib/database.types'
import { formatRupees } from '../../lib/bookingPricing'
import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Select from '../ui/Select'

type Attempt = Database['public']['Tables']['booking_payment_attempts']['Row']
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })

function downloadReceipt(attempt: Attempt) {
  const contents = [
    'NexRoad simulated payment receipt', '',
    `Booking: ${attempt.request_id}`, `Transaction: ${attempt.id}`,
    `Method: ${attempt.method}`, `Amount: ${formatRupees(attempt.amount_inr)}`,
    `Confirmed: ${date.format(new Date(attempt.created_at))} IST`, '',
    'Simulation only. No money was collected.',
  ].join('\n')
  const url = URL.createObjectURL(new Blob([contents], { type: 'text/plain;charset=utf-8' }))
  const link = document.createElement('a')
  link.href = url
  link.download = `nexroad-receipt-${attempt.id}.txt`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export default function BookingPayments({ requestId, amount, paymentMethod, paymentStatus }: {
  requestId: string
  amount: number
  paymentMethod: string
  paymentStatus: string
}) {
  const client = useQueryClient()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState(paymentMethod === 'online' ? 'online' : 'cash')
  const retry = useRef<{ id: string; method: string; succeeds: boolean } | null>(null)
  const key = ['booking-payment-attempts', requestId]
  const attempts = useQuery({
    queryKey: key,
    enabled: open,
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('booking_payment_attempts').select('*')
        .eq('request_id', requestId).order('created_at', { ascending: false }).order('id').abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const pay = useMutation({
    mutationFn: async (attempt: { id: string; method: string; succeeds: boolean }) => {
      const { data, error } = await supabase.rpc('simulate_booking_payment', {
        p_request_id: requestId, p_attempt_id: attempt.id, p_method: attempt.method, p_succeeds: attempt.succeeds,
      })
      if (error) throw error
      if (!data) throw new Error('Payment attempt unavailable')
      return data
    },
    onSuccess: async () => {
      retry.current = null
      await Promise.all([
        client.invalidateQueries({ queryKey: key }),
        client.invalidateQueries({ queryKey: ['customer-requests'] }),
      ])
    },
  })
  const settled = paymentStatus === 'paid' || paymentStatus === 'refunded'
    || pay.data === 'paid' || pay.data === 'already_paid' || attempts.data?.some(({ result }) => result === 'paid')

  function simulate(succeeds: boolean) {
    if (pay.isPending || settled) return
    const previous = retry.current
    const attempt = previous?.method === method && previous.succeeds === succeeds
      ? previous : { id: crypto.randomUUID(), method, succeeds }
    retry.current = attempt
    pay.mutate(attempt)
  }

  return (
    <div className="space-y-2">
      <Button size="sm" variant="outline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'Hide payments' : 'Payments and receipts'}
      </Button>
      {open && (
        <div className="space-y-3 rounded-xl border border-slate-200 p-3">
          <p className="text-sm">Final simulated charge <strong>{formatRupees(amount)}</strong></p>
          <p className="text-xs text-slate-600">This simulation does not collect money or payment details.</p>
          {!settled && (
            <div className="space-y-2">
              <Select id={`payment-${requestId}`} label="Payment method" value={method} disabled={pay.isPending}
                options={[{ value: 'cash', label: 'Cash' }, { value: 'online', label: 'Online' }]}
                onChange={(event) => { if (event.target.value) setMethod(event.target.value) }} />
              <div className="flex flex-wrap gap-2">
                <Button size="sm" loading={pay.isPending} onClick={() => simulate(true)}>
                  {method === 'cash' ? 'Confirm simulated cash' : 'Simulate successful payment'}
                </Button>
                {method === 'online' && <Button size="sm" variant="outline" disabled={pay.isPending} onClick={() => simulate(false)}>Simulate payment failure</Button>}
              </div>
            </div>
          )}
          {pay.isError && <Alert variant="error" title="Could not record the attempt. Try again." />}
          {pay.data === 'failed' && <Alert variant="warning" title="Simulated payment failed. You can retry." />}
          {pay.data === 'paid' && <Alert variant="success" title="Simulated payment confirmed." />}
          <h3 className="text-sm font-bold text-brand-navy">Transaction history</h3>
          {attempts.isPending && <p role="status" className="text-sm">Loading transactions…</p>}
          {attempts.isError && <Alert variant="warning" title="Could not load transaction history." />}
          {attempts.data?.length === 0 && <p className="text-sm text-slate-600">No simulated transactions yet.</p>}
          {attempts.data?.map((attempt) => (
            <div key={attempt.id} className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm">
              <div>
                <p className="capitalize">{attempt.method} · {attempt.result} · {formatRupees(attempt.amount_inr)}</p>
                <time dateTime={attempt.created_at} className="text-xs text-slate-600">{date.format(new Date(attempt.created_at))}</time>
              </div>
              {attempt.result === 'paid' && <Button size="sm" variant="ghost" onClick={() => downloadReceipt(attempt)}>Download receipt</Button>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
