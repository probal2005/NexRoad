import { useEffect, useState } from 'react'
import { ArrowRight, ClipboardList, Radio, ShieldCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import roadsideCover from '../assets/technician-roadside.webp'
import { useAuth } from '../auth/useAuth'
import LiveConnection from '../components/common/LiveConnection'
import { useDashboardRealtime } from '../lib/useDashboardRealtime'
import DashboardLayout from '../components/layout/DashboardLayout'
import TechnicianJobs from '../components/common/TechnicianJobs'
import TechnicianServices from '../components/common/TechnicianServices'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import { supabase } from '../lib/supabase'

function getCurrentFix() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location access is unavailable.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Could not access your location. Check browser permissions.')),
      { timeout: 10000, maximumAge: 5000 })
  })
}

type AvailabilityAction = 'online' | 'offline' | 'share' | 'stop' | 'resume' | 'pause'

function TechnicianAvailability({ technicianId }: { technicianId: string }) {
  const client = useQueryClient()
  const key = ['technician-availability', technicianId]
  const [tracking, setTracking] = useState(false)
  const [trackingError, setTrackingError] = useState('')
  const availability = useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('technician_availability')
        .select('is_online, accepting_requests, location_sharing').eq('technician_id', technicianId)
        .abortSignal(signal).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const save = useMutation({
    mutationFn: async (action: AvailabilityAction) => {
      if (action === 'share') {
        const position = await getCurrentFix()
        const { data, error } = await supabase.rpc('share_technician_location', {
          p_latitude: position.coords.latitude,
          p_longitude: position.coords.longitude,
        })
        if (error) throw error
        if (!data) throw new Error('Go online before sharing your location.')
        return
      }

      const fields = 'is_online, accepting_requests, location_sharing'
      const table = supabase.from('technician_availability')
      const result = action === 'online' || action === 'offline'
        ? await table.upsert(action === 'online'
          ? { technician_id: technicianId, is_online: true }
          : { technician_id: technicianId, is_online: false, accepting_requests: false, location_sharing: false },
        ).select(fields).single()
        : await table.update(action === 'stop'
          ? { location_sharing: false, accepting_requests: false }
          : { accepting_requests: action === 'resume' },
        ).eq('technician_id', technicianId)
          .match(action === 'resume' ? { is_online: true, location_sharing: true } : {}).select(fields).single()
      if (result.error) throw result.error
      client.setQueryData(key, result.data)
    },
    onSuccess: (_, action) => {
      if (action === 'share') {
        setTrackingError('')
        setTracking(true)
      }
    },
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })

  const canTrack = tracking && availability.data?.is_online && availability.data.location_sharing
  useEffect(() => {
    if (!canTrack) return

    let active = true
    let busy = false
    let controller: AbortController | undefined
    const timer = window.setInterval(() => {
      if (!active || busy || document.visibilityState !== 'visible') return
      busy = true
      void getCurrentFix().then(async ({ coords }) => {
        if (!active) return
        controller = new AbortController()
        const { data, error } = await supabase.rpc('update_shared_technician_location', {
          p_latitude: coords.latitude, p_longitude: coords.longitude,
        }).abortSignal(controller.signal)
        if (!active) return
        if (error) {
          setTrackingError('Location update interrupted. Retrying while this page is open.')
        } else if (data === 'inactive') {
          setTracking(false)
          setTrackingError('Location sharing is paused.')
        } else {
          setTrackingError('')
        }
      }).catch(() => {
        if (active) {
          setTracking(false)
          setTrackingError('Location access interrupted. Start sharing again to resume.')
        }
      }).finally(() => { busy = false })
    }, 15000)

    return () => {
      active = false
      window.clearInterval(timer)
      controller?.abort()
    }
  }, [canTrack])

  function changeAvailability(action: AvailabilityAction) {
    if (save.isPending) return
    if (action === 'stop' || action === 'offline') setTracking(false)
    setTrackingError('')
    save.mutate(action)
  }

  return (
    <Card padding="sm" className="space-y-4 sm:p-5">
      <h2 className="flex items-center gap-3 text-xl font-bold text-brand-navy">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-800"><Radio size={18} aria-hidden /></span>
        Availability
      </h2>
      {availability.isPending && <p role="status" className="text-sm text-slate-600">Loading availability…</p>}
      {availability.isError && (
        <Alert variant="error" title="Could not load your availability.">
          <Button size="sm" variant="outline" onClick={() => void availability.refetch()}>Retry availability</Button>
        </Alert>
      )}
      {availability.isSuccess && (
        <>
          <dl className="divide-y divide-slate-200 rounded-xl bg-slate-50 px-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <dt className="font-medium text-slate-700">Connection</dt>
              <dd><StatusBadge status={availability.data?.is_online ? 'available' : 'offline'}
                label={availability.data?.is_online ? 'Online' : 'Offline'} /></dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <dt className="font-medium text-slate-700">Incoming requests</dt>
              <dd className="font-semibold text-brand-navy">{availability.data?.accepting_requests ? 'Accepting requests' : 'Paused'}</dd>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <dt className="font-medium text-slate-700">Location sharing</dt>
              <dd className="font-semibold text-brand-navy">{availability.data?.location_sharing ? 'On' : 'Off'}</dd>
            </div>
          </dl>
          <Button fullWidth loading={save.isPending} onClick={() => {
            if (!save.isPending) changeAvailability(availability.data?.is_online ? 'offline' : 'online')
          }}>
            {availability.data?.is_online ? 'Go offline' : 'Go online'}
          </Button>
          {availability.data?.is_online && (
            <div className="space-y-3 rounded-xl border border-slate-200 p-3">
              <p className="text-sm leading-6 text-slate-600">Assigned customers and admins can see your shared location during active work. Updates run while this tab is visible. The last position expires after ten minutes.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => changeAvailability('share')}>
                  {canTrack ? 'Refresh shared location' : 'Start live location sharing'}
                </Button>
                {availability.data.location_sharing && (
                  <>
                    <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => changeAvailability('stop')}>Stop sharing</Button>
                    <Button variant="outline" size="sm" disabled={save.isPending}
                      onClick={() => changeAvailability(availability.data?.accepting_requests ? 'pause' : 'resume')}>
                      {availability.data.accepting_requests ? 'Pause incoming requests' : 'Accept incoming requests'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {canTrack && <p role="status" className="text-sm text-emerald-800">Live location sharing is running.</p>}
      {trackingError && <Alert variant="warning" title={trackingError} />}
      {save.isError && <Alert variant="error" title={save.error instanceof Error ? save.error.message : 'Could not update availability. Please try again.'} />}
    </Card>
  )
}

function TechnicianWorkspace({ applicationOnly }: { applicationOnly: boolean }) {
  const { profile, signOut } = useAuth()
  const connection = useDashboardRealtime('technician', !applicationOnly && profile?.role === 'technician' ? profile.id : undefined)
  const [signOutError, setSignOutError] = useState(false)
  const application = useQuery({
    queryKey: ['technician-application', profile?.id],
    enabled: Boolean(profile),
    queryFn: async ({ signal }) => {
      if (!profile) return null
      const { data, error } = await supabase.from('technician_applications')
        .select('status').eq('user_id', profile.id).abortSignal(signal).maybeSingle()
      if (error) throw error
      return data
    },
  })
  const status = application.data?.status
  const canManageWorkspace = status === 'approved' && profile?.role === 'technician'

  const applicationCard = (
    <Card id="application-status" padding="sm" className="scroll-mt-5 space-y-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy">
          <ShieldCheck size={20} className="shrink-0 text-emerald-700" aria-hidden /> Application status
        </h2>
        <Button size="sm" variant="outline" loading={application.isFetching} onClick={() => void application.refetch()}>Refresh status</Button>
      </div>
      {application.isPending && <p role="status" className="text-sm text-slate-600">Loading application status…</p>}
      {application.isError && <Alert variant="error" title="Could not load your application status." />}
      {application.isSuccess && (
        <>
          {status === 'approved' && (
            <>
              <StatusBadge status="verified" label="Approved" />
              {profile?.role !== 'technician' && (
                <p className="text-sm text-slate-600">Sign in again after your technician access is activated.</p>
              )}
              {applicationOnly && canManageWorkspace && (
                <Link className="block text-sm font-semibold text-emerald-800 hover:underline" to="/technician/dashboard">Open technician dashboard</Link>
              )}
            </>
          )}
          {status === 'pending' && <StatusBadge status="pending" label="Awaiting approval" />}
          {status === 'rejected' && <StatusBadge status="rejected" label="Application declined" />}
          {!status && <p className="text-sm text-slate-600">There is no technician application for this account.</p>}
        </>
      )}
    </Card>
  )

  return (
    <DashboardLayout
      title={applicationOnly ? 'Technician application' : 'Technician Dashboard'}
      coverImage={applicationOnly ? undefined : roadsideCover}
      description={applicationOnly ? 'Review your technician approval and next steps.' : 'Manage roadside jobs, availability and service rates.'}
      actions={!applicationOnly && canManageWorkspace && (
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a href="#technician-jobs" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-bold text-brand-navy! hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ClipboardList size={17} aria-hidden /> View jobs <ArrowRight size={16} aria-hidden />
          </a>
          <a href="#availability" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/50 bg-brand-navy/70 px-4 text-sm font-semibold text-white hover:bg-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <Radio size={17} aria-hidden /> Set availability
          </a>
        </div>
      )}
      status={!applicationOnly && <LiveConnection status={connection} />}
      sections={!applicationOnly && canManageWorkspace
        ? [['technician-jobs', 'Offers and jobs'], ['availability', 'Availability'], ['service-rates', 'Services and rates'], ['application-status', 'Application status']]
        : undefined}
      onSignOut={() => {
        setSignOutError(false)
        void signOut().catch(() => setSignOutError(true))
      }}
    >
      {signOutError && <Alert variant="error" title="Could not sign out. Please try again." />}
      {!applicationOnly && canManageWorkspace && profile ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section id="technician-jobs" aria-label="Offers and jobs" className="min-w-0 scroll-mt-5 space-y-6">
            <TechnicianJobs technicianId={profile.id} />
          </section>
          <div className="min-w-0 space-y-6">
            <div id="availability" className="scroll-mt-5"><TechnicianAvailability technicianId={profile.id} /></div>
            <div id="service-rates" className="scroll-mt-5"><TechnicianServices technicianId={profile.id} /></div>
            {applicationCard}
          </div>
        </div>
      ) : applicationCard}
      {applicationOnly && profile?.role === 'user' && (
        <Link className="text-sm font-semibold text-emerald-800 hover:underline" to="/dashboard">Back to customer dashboard</Link>
      )}
    </DashboardLayout>
  )
}

export default function TechnicianDashboardPage({ applicationOnly = false }: { applicationOnly?: boolean }) {
  const [client] = useState(() => new QueryClient())
  return (
    <QueryClientProvider client={client}>
      <TechnicianWorkspace applicationOnly={applicationOnly} />
    </QueryClientProvider>
  )
}
