import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'
import Card from '../ui/Card'
import BookingChat from './BookingChat'
import { useBookingChatUnread } from '../../lib/useBookingChatUnread'
import TechnicianServiceReport from './TechnicianServiceReport'
import { readBookingQuote } from '../../lib/bookingPricing'
import type { Json } from '../../lib/database.types'
import StatusBadge from '../ui/StatusBadge'

const jobSteps: Record<string, { status: string; label: string }> = {
  accepted: { status: 'technician_arriving', label: 'Start travelling' },
  technician_arriving: { status: 'in_progress', label: 'Start service' },
}
const money = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })
const time = new Intl.DateTimeFormat('en-IN', { timeStyle: 'short', timeZone: 'Asia/Kolkata' })

type Action =
  | { type: 'accept' | 'decline'; id: string }
  | { type: 'advance'; id: string; status: string }
  | { type: 'report'; id: string; report: Json }

export default function TechnicianJobs({ technicianId }: { technicianId: string }) {
  const client = useQueryClient()
  const unread = useBookingChatUnread(technicianId)
  const [historyPage, setHistoryPage] = useState(0)
  const dataKey = ['technician-jobs', technicianId, historyPage]
  const data = useQuery({
    queryKey: dataKey,
    queryFn: async ({ signal }) => {
      const [jobs, offers, metrics, completed] = await Promise.all([
        supabase.from('service_requests')
          .select('id, request_status, service_location, latitude, longitude, issue_description, service_categories(slug, name), booking_price_snapshots(quote), booking_service_workflow!booking_service_workflow_request_id_fkey(submitted_at)')
          .eq('assigned_technician_id', technicianId).in('request_status', [...Object.keys(jobSteps), 'in_progress'])
          .abortSignal(signal),
        supabase.rpc('technician_matching_offers').abortSignal(signal),
        supabase.rpc('technician_performance').abortSignal(signal).single(),
        supabase.from('service_requests').select('id, service_location, payment_status, completed_at')
          .eq('assigned_technician_id', technicianId).eq('request_status', 'completed')
          .order('completed_at', { ascending: false }).order('id').range(historyPage * 15, historyPage * 15 + 15).abortSignal(signal),
      ])
      if (jobs.error) throw jobs.error
      if (offers.error) throw offers.error
      if (metrics.error) throw metrics.error
      if (completed.error) throw completed.error
      return { jobs: jobs.data, offers: offers.data, metrics: metrics.data, completed: completed.data.slice(0, 15), hasOlder: completed.data.length > 15 }
    },
    refetchInterval: 15000,
  })
  const change = useMutation({
    mutationFn: async (action: Action) => {
      if (action.type === 'report') {
        const { data, error } = await supabase.rpc('submit_technician_service', { p_request_id: action.id, p_report: action.report })
        if (error) throw error
        return Boolean(data)
      }
      if (action.type === 'advance') {
        const { data, error } = await supabase.rpc('advance_technician_job', {
          p_request_id: action.id, p_status: action.status,
        })
        if (error) throw error
        return Boolean(data)
      }
      const { data, error } = action.type === 'accept'
        ? await supabase.rpc('accept_request_offer', { p_offer_id: action.id })
        : await supabase.rpc('decline_technician_offer', { p_offer_id: action.id })
      if (error) throw error
      return Boolean(data)
    },
    onSettled: () => Promise.all([
      client.invalidateQueries({ queryKey: dataKey }),
      client.invalidateQueries({ queryKey: ['technician-availability', technicianId] }),
    ]),
  })

  return (
    <>
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-brand-navy">Offers and active jobs</h2>
          <Button size="sm" variant="outline" loading={data.isFetching} onClick={() => void data.refetch()}>Refresh jobs</Button>
        </div>
        {data.isPending && <p role="status" className="text-sm text-slate-600">Loading jobs…</p>}
        {data.isError && (
          <Alert variant="warning" title="Job tools are unavailable.">
            The Supabase job workflow must be enabled, and your technician account must be approved.
          </Alert>
        )}
        {change.isError && <Alert variant="error" title="Could not update this job or offer." />}
        {change.isSuccess && !change.data && <Alert variant="warning" title="This job or offer has changed. Review its latest status." />}
        {change.isSuccess && change.data && <Alert variant="success" title="Job or offer updated." />}
        {data.data && (
          <>
            <p aria-live="polite" className="text-sm text-slate-600">{data.data.offers.length
              ? `${data.data.offers.length} incoming ${data.data.offers.length === 1 ? 'offer' : 'offers'}` : 'No open offers.'}</p>
            {data.data.offers.map((offer) => (
              <div key={offer.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-brand-navy">{offer.service} offer</h3>
                <p className="text-sm text-slate-600">Expires at {time.format(new Date(offer.expires_at))}
                  {offer.estimated_distance_km !== null && ` · ${offer.estimated_distance_km} km estimated approach`}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" disabled={change.isPending || data.data.jobs.length > 0}
                    onClick={() => change.mutate({ type: 'accept', id: offer.id })}>Accept offer</Button>
                  <Button size="sm" variant="outline" disabled={change.isPending}
                    onClick={() => change.mutate({ type: 'decline', id: offer.id })}>Decline offer</Button>
                </div>
              </div>
            ))}
            {data.data.jobs.length === 0 && <p className="text-sm text-slate-600">No active jobs.</p>}
            {data.data.jobs.map((job) => {
              const step = jobSteps[job.request_status]
              const submitted = Boolean(job.booking_service_workflow?.submitted_at)
              const quote = readBookingQuote(job.booking_price_snapshots?.quote)

              return (
                <div key={job.id} className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <h3 className="font-bold text-brand-navy">{job.service_categories?.name ?? 'Assigned roadside job'}</h3>
                  <StatusBadge status="active" label={job.request_status.replaceAll('_', ' ')} className="capitalize" />
                  <p className="break-words text-sm text-slate-600">{job.service_location}</p>
                  {job.issue_description && <p className="whitespace-pre-line break-words text-sm text-slate-600">{job.issue_description}</p>}
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${job.latitude},${job.longitude}`)}`}
                    target="_blank" rel="noreferrer" className="inline-flex text-sm font-semibold text-emerald-800 hover:underline">Open pickup directions</a>
                  <BookingChat requestId={job.id} viewer="technician" unread={unread.data?.[job.id] ?? 0} />
                  {step && <div><Button size="sm" disabled={change.isPending}
                    onClick={() => change.mutate({ type: 'advance', id: job.id, status: step.status })}>{step.label}</Button></div>}
                  {job.request_status === 'in_progress' && (submitted
                    ? <Alert title="Awaiting customer confirmation">The booking stays active until the customer confirms the report.</Alert>
                    : <TechnicianServiceReport service={job.service_categories?.slug} bookedLitres={quote?.fuel_litres}
                      pending={change.isPending} onSubmit={(report) => change.mutate({ type: 'report', id: job.id, report })} />)}
                </div>
              )
            })}
          </>
        )}
      </Card>
      {data.data && (data.data.completed.length > 0 || historyPage > 0) && (
        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-brand-navy">Completed jobs</h2>
          {data.data.completed.map((job) => (
            <div key={job.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <p className="font-semibold text-brand-navy">{job.service_location}</p>
              <p className="text-sm capitalize text-slate-600">Simulated payment · {job.payment_status}</p>
              <BookingChat requestId={job.id} viewer="technician" unread={unread.data?.[job.id] ?? 0} />
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {historyPage > 0 && <Button size="sm" variant="outline" onClick={() => setHistoryPage(historyPage - 1)}>Newer jobs</Button>}
            {data.data.hasOlder && <Button size="sm" variant="outline" onClick={() => setHistoryPage(historyPage + 1)}>Older jobs</Button>}
          </div>
        </Card>
      )}
      {data.data && (
        <Card className="space-y-3">
          <h2 className="text-xl font-bold text-brand-navy">Performance</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div><dt>Completed jobs</dt><dd className="font-bold">{data.data.metrics.completed_jobs}</dd></div>
            <div><dt>Average rating</dt><dd className="font-bold">
              {data.data.metrics.average_rating === null ? 'No ratings yet' : `${Number(data.data.metrics.average_rating).toFixed(1)} / 5 (${data.data.metrics.rated_jobs})`}
            </dd></div>
            <div><dt>Simulated earnings</dt><dd className="font-bold">
              {money.format(data.data.metrics.simulated_earnings ?? 0)}
            </dd></div>
          </dl>
          <p className="text-xs text-slate-600">Earnings reflect confirmed simulated payments on completed jobs.</p>
        </Card>
      )}
    </>
  )
}
