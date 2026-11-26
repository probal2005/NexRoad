import { Fragment, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Bell, ClipboardList } from 'lucide-react'

import { supabase } from '../../lib/supabase'
import BookingChat from './BookingChat'
import BookingPayments from './BookingPayments'
import BookingPrice from './BookingPrice'
import { useBookingChatUnread } from '../../lib/useBookingChatUnread'
import { formatRupees, readBookingQuote } from '../../lib/bookingPricing'
import CustomerServiceWorkflow, { type TowFollowup } from './CustomerServiceWorkflow'
import CustomerComplaintForm from './CustomerComplaintForm'
import CustomerRequestFeedback from './CustomerRequestFeedback'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import ConfirmDialog from '../ui/ConfirmDialog'
import StatusBadge, { type StatusType } from '../ui/StatusBadge'

const chatStatuses = ['accepted', 'technician_arriving', 'in_progress', 'completed']
const cancellable = ['requested', 'matching']
const active = [...cancellable, 'accepted', 'technician_arriving', 'in_progress']
const terminal = ['completed', 'cancelled', 'expired']
const statuses: Record<string, { label: string; status: StatusType }> = {
  requested: { label: 'Requested', status: 'pending' },
  matching: { label: 'Finding a technician', status: 'pending' },
  accepted: { label: 'Accepted', status: 'accepted' },
  technician_arriving: { label: 'Technician arriving', status: 'active' },
  in_progress: { label: 'In progress', status: 'active' },
  completed: { label: 'Completed', status: 'completed' },
  cancelled: { label: 'Cancelled', status: 'cancelled' },
  expired: { label: 'Expired', status: 'cancelled' },
}
const dateTime = new Intl.DateTimeFormat('en-IN', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Kolkata',
})

export default function CustomerRequests({ customerId, categories, onTowFollowup }: {
  customerId: string
  categories: { id: string; name: string }[]
  onTowFollowup: (booking: TowFollowup) => void
}) {
  const unread = useBookingChatUnread(customerId)
  const [historyPage, setHistoryPage] = useState(0)
  const [pendingCancellation, setPendingCancellation] = useState<string | null>(null)
  const [cancellationNotice, setCancellationNotice] = useState('')
  const requests = useQuery({
    queryKey: ['customer-requests', customerId, historyPage],
    queryFn: async ({ signal }) => {
      const fields = 'id, category_id, request_status, service_location, requested_at, issue_description, payment_status, payment_method, assigned_technician_id, latitude, longitude, service_outcome, booking_service_workflow!booking_service_workflow_request_id_fkey(*), booking_price_snapshots(quote, booking_final_charges(total_inr))'
      const forStatuses = (states: string[]) => supabase.from('service_requests')
        .select(fields).eq('customer_id', customerId).in('request_status', states)
        .order('requested_at', { ascending: false }).order('id').abortSignal(signal)
      const [current, history] = await Promise.all([
        forStatuses(active),
        forStatuses(terminal).range(historyPage * 20, historyPage * 20 + 20),
      ])
      if (current.error) throw current.error
      if (history.error) throw history.error
      return { current: current.data, history: history.data.slice(0, 20), hasOlder: history.data.length > 20 }
    },
    refetchInterval: 15000,
  })

  const updates = useQuery({
    queryKey: ['customer-request-updates', customerId],
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('request_activity_history')
        .select('id, request_id, new_status, created_at').eq('event_type', 'request_status')
        .order('created_at', { ascending: false }).order('id', { ascending: false }).limit(10).abortSignal(signal)
      if (error) throw error
      return data
    },
  })

  const cancel = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('cancel_customer_request', { p_request_id: requestId })
      if (error) throw error
      return data
    },
    onSettled: () => Promise.all([requests.refetch(), updates.refetch()]),
    onSuccess: (cancelled) => {
      setPendingCancellation(null)
      if (cancelled) setCancellationNotice('Request cancelled.')
      else setCancellationNotice('This request is no longer eligible for cancellation.')
    },
    onError: () => setPendingCancellation(null),
  })

  const retryMatching = useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.rpc('retry_customer_matching', { p_request_id: requestId })
      if (error) throw error
      if (!data) throw new Error('Request unavailable')
      return data
    },
    onSettled: () => Promise.all([requests.refetch(), updates.refetch()]),
  })

  const sections = [
    { id: 'active-requests', heading: 'Active requests', data: requests.data?.current, empty: 'No active requests.' },
    { id: 'request-history', heading: 'Recent request history', data: requests.data?.history, empty: 'No completed, cancelled or expired requests.' },
  ]

  const updatesCard = (
    <Card id="request-updates" padding="sm" className="scroll-mt-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-800"><Bell size={18} aria-hidden /></span> Request updates</h2>
        <Button size="sm" variant="ghost" loading={updates.isFetching} onClick={() => void updates.refetch()}>Refresh updates</Button>
      </div>
      {updates.isPending && <p className="mt-3 text-sm text-slate-600" role="status">Loading updates…</p>}
      {updates.isError && <p className="mt-3 text-sm text-slate-600" role="status">Request updates are unavailable.</p>}
      {updates.data && (updates.data.length ? (
        <ul aria-live="polite" className="mt-3 divide-y divide-slate-200">
          {updates.data.map((event) => (
            <li key={event.id} className="py-2 text-sm text-slate-600">
              <strong className="text-brand-navy">Request {event.request_id.slice(0, 8)}</strong>
              {' · '}{statuses[event.new_status]?.label ?? event.new_status}
              <time className="block text-xs" dateTime={event.created_at}>{dateTime.format(new Date(event.created_at))}</time>
            </li>
          ))}
        </ul>
      ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No request updates yet.</p>)}
    </Card>
  )

  return (
    <>
      {sections.map(({ id, heading, data, empty }) => (
        <Fragment key={id}>
          {id === 'request-history' && updatesCard}
          <Card id={id} padding="sm" className="scroll-mt-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800"><ClipboardList size={18} aria-hidden /></span> {heading}</h2>
              {id === 'active-requests' && (
                <Button size="sm" variant="outline" loading={requests.isFetching} onClick={() => void requests.refetch()}>Refresh</Button>
              )}
            </div>
            {id === 'active-requests' && requests.isError && <Alert variant="error" title="Could not load your requests." />}
            {id === 'active-requests' && retryMatching.isError && <Alert variant="error" title="Could not retry matching." />}
            {id === 'active-requests' && retryMatching.isSuccess && retryMatching.data === 'requested'
              && <Alert title="No eligible technicians are available yet.">NexRoad will keep looking during the request window.</Alert>}
            {id === 'active-requests' && cancel.isError && <Alert variant="error" title="Could not cancel your request. Please try again." />}
            {id === 'active-requests' && cancellationNotice && <Alert title={cancellationNotice} />}
            {requests.isPending && <p className="mt-4 text-slate-600" role="status">Loading requests…</p>}
            {data && (data.length ? (
              <ul className="mt-4 space-y-3">
                {data.map((request) => {
                  const price = request.booking_price_snapshots
                  const quote = readBookingQuote(price?.quote)
                  return (
                  <li key={request.id} className="min-w-0 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-brand-navy">{categories.find(({ id }) => id === request.category_id)?.name ?? 'Roadside assistance'}</p>
                        <p className="break-words text-sm text-slate-600">{request.service_location}</p>
                        <time className="text-xs text-slate-500" dateTime={request.requested_at}>{dateTime.format(new Date(request.requested_at))}</time>
                      </div>
                      <StatusBadge {...(statuses[request.request_status] ?? { label: request.request_status, status: 'pending' })} />
                    </div>
                    {id === 'active-requests' && (
                      <>
                        {request.issue_description && <p className="break-words text-sm text-slate-600">{request.issue_description}</p>}
                        <p className="text-sm text-slate-600">
                          Payment <span className="capitalize">{request.payment_method} · {request.payment_status}</span>
                        </p>
                        {request.request_status === 'requested' && (
                          <div className="space-y-2">
                            <p className="text-sm text-slate-600">Waiting for an eligible technician nearby.</p>
                            <Button size="sm" variant="outline" disabled={retryMatching.isPending || cancel.isPending}
                              onClick={() => retryMatching.mutate(request.id)}>Retry matching</Button>
                          </div>
                        )}
                        {cancellable.includes(request.request_status) && (
                          <Button variant="outline" size="sm" onClick={() => {
                            cancel.reset()
                            setCancellationNotice('')
                            setPendingCancellation(request.id)
                          }}>Cancel request</Button>
                        )}
                      </>
                    )}
                    {chatStatuses.includes(request.request_status)
                      && <CustomerRequestFeedback requestId={request.id} completed={request.request_status === 'completed'} />}
                    {quote && (
                      <details className="space-y-2 text-sm text-brand-navy">
                        <summary className="cursor-pointer font-semibold">Price breakdown · {formatRupees(quote.total_inr)}</summary>
                        <BookingPrice quote={quote} finalCharge={price?.booking_final_charges?.total_inr} />
                      </details>
                    )}
                    <CustomerServiceWorkflow customerId={customerId} workflow={request.booking_service_workflow ?? null}
                      booking={{ id: request.id, address: request.service_location, latitude: request.latitude,
                        longitude: request.longitude, status: request.request_status, outcome: request.service_outcome }}
                      onTowFollowup={onTowFollowup} />
                    {request.assigned_technician_id && chatStatuses.includes(request.request_status) && (
                      <BookingChat requestId={request.id} viewer="customer" unread={unread.data?.[request.id] ?? 0} />
                    )}
                    {request.request_status === 'completed' && price?.booking_final_charges?.total_inr != null && (
                      <BookingPayments requestId={request.id} amount={price.booking_final_charges.total_inr}
                        paymentMethod={request.payment_method} paymentStatus={request.payment_status} />
                    )}
                    <CustomerComplaintForm requestId={request.id} />
                  </li>
                  )
                })}
              </ul>
            ) : <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">{empty}</p>)}
            {id === 'request-history' && (historyPage > 0 || requests.data?.hasOlder) && (
              <div className="mt-4 flex flex-wrap gap-2">
                {historyPage > 0 && <Button size="sm" variant="outline" onClick={() => setHistoryPage(historyPage - 1)}>Newer requests</Button>}
                {requests.data?.hasOlder && <Button size="sm" variant="outline" onClick={() => setHistoryPage(historyPage + 1)}>Older requests</Button>}
              </div>
            )}
          </Card>
        </Fragment>
      ))}
      <ConfirmDialog open={pendingCancellation !== null} title="Cancel assistance request?"
        description="The request will stop looking for a technician and stay in your request history."
        confirmLabel="Cancel request" cancelLabel="Keep request" variant="danger" loading={cancel.isPending}
        onClose={() => setPendingCancellation(null)} onConfirm={() => {
          if (pendingCancellation && !cancel.isPending) cancel.mutate(pendingCancellation)
        }} />
    </>
  )
}
