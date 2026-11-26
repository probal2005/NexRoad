import { useState } from 'react'
import { Link } from 'react-router-dom'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../auth/useAuth'
import BrandLogo from '../components/common/BrandLogo'
import TechnicianJobs from '../components/common/TechnicianJobs'
import TechnicianServices from '../components/common/TechnicianServices'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import { supabase } from '../lib/supabase'

type AvailabilityAction = 'online' | 'offline' | 'share' | 'stop' | 'resume' | 'pause'

function TechnicianAvailability({ technicianId }: { technicianId: string }) {
  const client = useQueryClient()
  const key = ['technician-availability', technicianId]
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
        if (!navigator.geolocation) throw new Error('Location access is unavailable.')
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, () => reject(new Error('Could not access your location. Check browser permissions.')), { timeout: 10000 })
        })
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
    onSettled: () => client.invalidateQueries({ queryKey: key }),
  })

  return (
    <Card className="space-y-4">
      <h2 className="text-xl font-bold text-brand-navy">Availability</h2>
      {availability.isPending && <p role="status" className="text-sm text-slate-600">Loading availability…</p>}
      {availability.isError && (
        <Alert variant="error" title="Could not load your availability.">
          <Button size="sm" variant="outline" onClick={() => void availability.refetch()}>Retry availability</Button>
        </Alert>
      )}
      {availability.isSuccess && (
        <>
          <StatusBadge status={availability.data?.is_online ? 'available' : 'offline'}
            label={availability.data?.is_online ? 'Online' : 'Offline'} />
          <p className="text-sm text-slate-600">
            {availability.data?.accepting_requests ? 'Accepting requests' : 'Incoming requests are paused'}
            {' · '}
            {availability.data?.location_sharing ? 'Location sharing on' : 'Location sharing off'}
          </p>
          <Button loading={save.isPending} onClick={() => {
            if (!save.isPending) save.mutate(availability.data?.is_online ? 'offline' : 'online')
          }}>
            {availability.data?.is_online ? 'Go offline' : 'Go online'}
          </Button>
          {availability.data?.is_online && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600">Share a one-time location for matching. Refresh it before accepting offers.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate('share')}>
                  {availability.data.location_sharing ? 'Refresh shared location' : 'Share current location'}
                </Button>
                {availability.data.location_sharing && (
                  <>
                    <Button variant="outline" size="sm" disabled={save.isPending} onClick={() => save.mutate('stop')}>Stop sharing</Button>
                    <Button variant="outline" size="sm" disabled={save.isPending}
                      onClick={() => save.mutate(availability.data?.accepting_requests ? 'pause' : 'resume')}>
                      {availability.data.accepting_requests ? 'Pause incoming requests' : 'Accept incoming requests'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
      {save.isError && <Alert variant="error" title={save.error instanceof Error ? save.error.message : 'Could not update availability. Please try again.'} />}
    </Card>
  )
}

function TechnicianWorkspace({ applicationOnly }: { applicationOnly: boolean }) {
  const { profile, signOut } = useAuth()
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

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo size="sm" showTagline={false} />
          <Button size="sm" variant="outline" onClick={() => {
            setSignOutError(false)
            void signOut().catch(() => setSignOutError(true))
          }}>Sign out</Button>
        </div>
      </header>
      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-extrabold text-brand-navy">
          {applicationOnly ? 'Technician application' : 'Technician Dashboard'}
        </h1>
        {signOutError && <Alert variant="error" title="Could not sign out. Please try again." />}
        <Card className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold text-brand-navy">Application status</h2>
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
        {!applicationOnly && canManageWorkspace && profile && (
          <>
            <TechnicianAvailability technicianId={profile.id} />
            <TechnicianServices technicianId={profile.id} />
            <TechnicianJobs technicianId={profile.id} />
          </>
        )}
        {applicationOnly && profile?.role === 'user' && (
          <Link className="text-sm font-semibold text-emerald-800 hover:underline" to="/dashboard">Back to customer dashboard</Link>
        )}
      </div>
    </main>
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
