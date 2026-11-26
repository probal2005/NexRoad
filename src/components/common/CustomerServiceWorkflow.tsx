import { lazy, Suspense, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type { Database } from '../../lib/database.types'
import { supabase } from '../../lib/supabase'
import Alert from '../ui/Alert'
import Button from '../ui/Button'

const ArrivalMap = lazy(() => import('./SimulatedArrivalMap'))
const labels: Record<string, string> = {
  requested: 'Request submitted', matching: 'Finding a technician', accepted: 'Technician assigned',
  technician_arriving: 'Technician travelling', in_progress: 'Technician arrived and service started',
  completed: 'Service completed', cancelled: 'Request cancelled', expired: 'Request expired',
  report_submitted: 'Service report sent for confirmation', confirmed: 'Customer confirmed service',
}
const time = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })

type Workflow = Database['public']['Tables']['booking_service_workflow']['Row']
export type TowFollowup = { id: string; address: string; latitude: number; longitude: number }

export default function CustomerServiceWorkflow({ customerId, booking, workflow, onTowFollowup }: {
  customerId: string
  booking: TowFollowup & { status: string; outcome: string | null }
  workflow: Workflow | null
  onTowFollowup: (booking: TowFollowup) => void
}) {
  const [showMap, setShowMap] = useState(false)
  const [showTimeline, setShowTimeline] = useState(false)
  const client = useQueryClient()
  const showLocation = ['accepted', 'technician_arriving', 'in_progress'].includes(booking.status)
  const location = useQuery({
    queryKey: ['customer-booking-location', booking.id],
    enabled: showMap && showLocation,
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('customer_booking_location', { p_request_id: booking.id })
        .abortSignal(signal).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const timeline = useQuery({
    queryKey: ['customer-service-timeline', booking.id],
    enabled: showTimeline,
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('request_activity_history')
        .select('id,new_status,created_at').eq('request_id', booking.id).eq('event_type', 'request_status')
        .order('created_at').order('id').abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const confirm = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc('confirm_customer_service', { p_request_id: booking.id })
      if (error) throw error
      if (!data) throw new Error('Service confirmation unavailable')
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: ['customer-requests', customerId] }),
      client.invalidateQueries({ queryKey: ['customer-request-updates', customerId] }),
      client.invalidateQueries({ queryKey: ['customer-service-timeline', booking.id] }),
    ]),
  })

  const events = [
    ...(timeline.data ?? []).map((event) => event.new_status === 'completed' && workflow?.confirmed_at
      ? { ...event, created_at: workflow.confirmed_at } : event),
    ...(workflow?.submitted_at ? [{ id: 'submitted', new_status: 'report_submitted', created_at: workflow.submitted_at }] : []),
    ...(workflow?.confirmed_at ? [{ id: 'confirmed', new_status: 'confirmed', created_at: workflow.confirmed_at }] : []),
  ].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)
    || Number(b.new_status === 'confirmed') - Number(a.new_status === 'confirmed'))
  const outcome = workflow?.mechanical_outcome ?? booking.outcome

  return (
    <div className="space-y-2">
      {showLocation && (
        <>
          <Button size="sm" variant="outline" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Hide technician map' : 'Show technician map'}
          </Button>
          {showMap && (
            <>
              {location.isPending && <p role="status" className="text-sm text-slate-600">Checking shared location…</p>}
              {location.data || (booking.status === 'technician_arriving' && workflow?.departed_at) ? (
                <Suspense fallback={<p role="status">Loading arrival map…</p>}>
                  <ArrivalMap latitude={booking.latitude} longitude={booking.longitude}
                    departedAt={workflow?.departed_at ?? null} live={location.data} />
                </Suspense>
              ) : !location.isPending && <p className="text-sm text-slate-600">No recent shared technician location.</p>}
              {location.data && <p className="text-xs text-slate-600">Last updated {time.format(new Date(location.data.updated_at))}</p>}
            </>
          )}
        </>
      )}
      {workflow?.submitted_at && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
          <h3 className="font-bold text-brand-navy">Technician service report</h3>
          <p className="whitespace-pre-line break-words">{workflow.summary}</p>
          {workflow.fuel_litres != null && <p>Fuel delivered · {workflow.fuel_litres} L</p>}
          {workflow.drop_off && <p>Drop-off · {workflow.drop_off}</p>}
          {booking.status === 'in_progress' && (
            <Button size="sm" loading={confirm.isPending} onClick={() => { if (!confirm.isPending) confirm.mutate() }}>
              Confirm service
            </Button>
          )}
          {confirm.isError && <Alert variant="error" title="Could not confirm service. Refresh and try again." />}
        </div>
      )}
      {outcome === 'roadside_repair' && <p className="text-sm text-emerald-800">Mechanical issue resolved at the roadside.</p>}
      {outcome === 'garage_required' && <Alert title="Garage inspection recommended">The technician recommends further diagnosis at a garage. Review their report for details.</Alert>}
      {outcome === 'towing_required' && (
        <Alert title="Towing recommended">
          {workflow?.followup_request_id ? 'A follow-up tow is already booked. Check the requests list for its status.'
            : booking.status === 'completed' ? <Button size="sm" variant="outline" onClick={() => onTowFollowup(booking)}>Book follow-up towing</Button>
              : 'Confirm service to book a follow-up tow.'}
        </Alert>
      )}
      <Button size="sm" variant="ghost" aria-expanded={showTimeline} onClick={() => setShowTimeline(!showTimeline)}>
        {showTimeline ? 'Hide service timeline' : 'View service timeline'}
      </Button>
      {showTimeline && (
        <div className="space-y-2 border-l-2 border-emerald-200 pl-3">
          {timeline.isPending && <p role="status" className="text-sm">Loading service timeline…</p>}
          {timeline.isError && <Alert variant="error" title="Could not load the timeline." />}
          {timeline.isSuccess && (
            events.length ? <ol className="space-y-2">{events.map((event) => (
              <li key={event.id} className="text-sm"><p>{labels[event.new_status] ?? event.new_status}</p>
                <time className="text-xs text-slate-600" dateTime={event.created_at}>{time.format(new Date(event.created_at))}</time></li>
            ))}</ol> : <p className="text-sm text-slate-600">No timeline entries yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
