import { lazy, Suspense, useState, type SubmitEvent } from 'react'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '../auth/useAuth'
import AdminFuelPrices from '../components/common/AdminFuelPrices'
import LiveConnection from '../components/common/LiveConnection'
import { useDashboardRealtime } from '../lib/useDashboardRealtime'
import DashboardLayout from '../components/layout/DashboardLayout'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Input from '../components/ui/Input'
import type { Json } from '../lib/database.types'
import { supabase } from '../lib/supabase'

const TechnicianMap = lazy(() => import('../components/common/AdminTechnicianMap'))

type Account = {
  id: string; full_name: string; email: string | null; role: string; suspended: boolean; application_status: string | null; application_note: string | null
}
type Category = {
  id: string; name: string; is_active: boolean; base_price: number | null; service_charge: number | null; per_km_charge: number | null
}
type Overview = {
  accounts: Account[]
  categories: Category[]
  bookings: { id: string; service: string; request_status: string; payment_method: string; payment_status: string; requested_at: string }[]
  locations: { id: string; full_name: string; latitude: number; longitude: number; updated_at: string }[]
  complaints: { id: string; request_id: string | null; message: string; status: string; created_at: string }[]
  audit: { id: number; actor_id: string; action: string; target_id: string | null; created_at: string }[]
  settings: { support_email: string | null; matching_radius_km: number }
  statistics: { customers: number; technicians: number; pending_applications: number; bookings: number; request_statuses: Record<string, number>; payment_statuses: Record<string, number> }
}

type AdminChange = { action: string; target: string | null; values: Json }
type Confirmation = { title: string; description: string; change: AdminChange }

const sections = [
  ['overview', 'Overview'], ['accounts', 'Accounts'], ['services', 'Services'],
  ['bookings', 'Bookings'], ['technicians', 'Technician map'], ['complaints', 'Complaints'],
  ['audit', 'Audit history'], ['settings', 'Settings'],
] as const
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
const display = (value: string) => value.replaceAll('_', ' ')
const textStyle = 'text-sm text-slate-600'
const titleStyle = 'text-xl font-bold text-brand-navy'

function StatusChart({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values)
  const max = Math.max(1, ...entries.map(([, count]) => count))
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      {entries.length ? entries.map(([status, count]) => (
        <div key={status}>
          <p className="flex justify-between text-xs capitalize text-slate-700"><span>{display(status)}</span><span>{count}</span></p>
          <div aria-hidden className="mt-1 h-2 rounded bg-slate-100">
            <div className="h-full rounded bg-emerald-600" style={{ width: `${100 * count / max}%` }} />
          </div>
        </div>
      )) : <p className={textStyle}>No records yet.</p>}
    </div>
  )
}

function AdminWorkspace() {
  const { user, signOut } = useAuth()
  const connection = useDashboardRealtime('admin', user?.id)
  const client = useQueryClient()
  const [search, setSearch] = useState('')
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null)
  const [notice, setNotice] = useState<{ message: string; error?: boolean } | null>(null)
  const [showMap, setShowMap] = useState(false)
  const key = ['admin-overview', user?.id]
  const overview = useQuery({
    queryKey: key,
    refetchInterval: 15000,
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.rpc('admin_overview').abortSignal(signal)
      if (error) throw error
      if (typeof data !== 'object' || !data || !('statistics' in data)) throw new Error('Invalid admin response')
      return data as unknown as Overview
    },
  })
  const change = useMutation({
    mutationFn: async ({ action, target, values }: AdminChange) => {
      const { data, error } = await supabase.rpc('admin_update', { p_action: action, p_target: target, p_values: values })
      if (error) throw error
      return data
    },
    onSuccess: async (updated) => {
      setConfirmation(null)
      setNotice(updated ? { message: 'Change saved.' } : { message: 'The record changed or this action is unavailable.', error: true })
      await client.invalidateQueries({ queryKey: key })
    },
    onError: () => {
      setConfirmation(null)
      setNotice({ message: 'Could not save the change.', error: true })
    },
  })

  function submit(event: SubmitEvent<HTMLFormElement>, action: string, target: string | null,
    values: (data: FormData) => Json) {
    event.preventDefault()
    if (change.isPending) return
    setNotice(null)
    change.mutate({ action, target, values: values(new FormData(event.currentTarget)) })
  }

  function confirmAccount(account: Account, action: string, label: string) {
    setNotice(null)
    const name = account.full_name || account.email || 'this account'
    const reason = action === 'suspend_account' ? ' Accounts with open jobs cannot be suspended.' : ''
    setConfirmation({ title: label, description: `${label} for ${name}?${reason}`,
      change: { action, target: account.id, values: {} } })
  }

  const data = overview.data
  const accountSearch = search.trim().toLowerCase()
  const visibleAccounts = data?.accounts.filter(({ full_name, email, role }) =>
    `${full_name} ${email ?? ''} ${role}`.toLowerCase().includes(accountSearch)) ?? []

  return (
    <DashboardLayout
      title="Admin Dashboard"
      status={<LiveConnection status={connection} />}
      sections={data ? sections : undefined}
      actions={<Button size="sm" variant="outline" loading={overview.isFetching} onClick={() => void overview.refetch()}>Refresh dashboard</Button>}
      onSignOut={() => void signOut().catch(() => setNotice({ message: 'Could not sign out.', error: true }))}
    >
      {overview.isPending && <p role="status" className={textStyle}>Loading admin overview…</p>}
      {overview.isError && <Alert variant="warning" title="Admin tools are unavailable.">The admin database migration and an active administrator account are required.</Alert>}
      {notice && <Alert variant={notice.error ? 'error' : 'success'} title={notice.message} onClose={() => setNotice(null)} />}
      {data && (
        <>
          <Card id="overview" className="scroll-mt-5 space-y-5">
            <h2 className={titleStyle}>Overview</h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['Customers', data.statistics.customers], ['Technicians', data.statistics.technicians],
                ['Pending applications', data.statistics.pending_applications], ['Bookings', data.statistics.bookings],
              ].map(([label, count]) => (
                <div key={label} className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4"><dt className={textStyle}>{label}</dt><dd className="mt-1 text-2xl font-bold tabular-nums text-brand-navy">{count}</dd></div>
              ))}
            </dl>
            <div className="grid gap-5 sm:grid-cols-2">
              <StatusChart title="Booking statuses" values={data.statistics.request_statuses} />
              <StatusChart title="Simulated payment statuses" values={data.statistics.payment_statuses} />
            </div>
          </Card>
          <Card id="accounts" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Customers and technicians</h2>
            <Input name="account-search" label="Filter loaded accounts" value={search} onChange={(event) => setSearch(event.target.value)} />
            <p className={textStyle}>Up to 100 accounts. Pending applications appear first.</p>
            {visibleAccounts.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600" role="status">No accounts match this filter.</p>}
            {visibleAccounts.map((account) => (
              <div key={account.id} className="flex flex-wrap justify-between gap-3 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0 break-words">
                  <h3 className="font-semibold text-brand-navy">{account.full_name || 'Unnamed account'}</h3>
                  <p className={textStyle}>{account.email}</p>
                  {account.application_note && <p className="whitespace-pre-line text-sm text-slate-600">{account.application_note}</p>}
                  <p className="text-xs capitalize text-slate-700">{account.role} · {account.suspended ? 'Suspended' : 'Active'}{account.application_status && ` · Application ${account.application_status}`}</p>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  {account.application_status === 'pending' && !account.suspended && account.role === 'user' && (
                    <>
                      <Button size="sm" disabled={change.isPending} onClick={() => confirmAccount(account, 'approve_application', 'Approve application')}>Approve</Button>
                      <Button size="sm" variant="outline" disabled={change.isPending} onClick={() => confirmAccount(account, 'reject_application', 'Reject application')}>Reject</Button>
                    </>
                  )}
                  {account.role !== 'admin' && <Button size="sm" variant="outline" disabled={change.isPending}
                    onClick={() => confirmAccount(account, account.suspended ? 'reactivate_account' : 'suspend_account', account.suspended ? 'Reactivate account' : 'Suspend account')}>
                    {account.suspended ? 'Reactivate' : 'Suspend'}
                  </Button>}
                </div>
              </div>
            ))}
          </Card>
          <Card id="services" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Service categories and pricing</h2>
            <p className={textStyle}>Rates are used for new customer quotes. Confirmed booking prices stay fixed.</p>
            <AdminFuelPrices adminId={user?.id} />
            {data.categories.map((category) => (
              <div key={category.id} className="space-y-4 rounded-xl border border-slate-200 p-4">
                <form aria-label={`Category ${category.name}`} className="space-y-3"
                  onSubmit={(event) => submit(event, 'update_category', category.id, (form) => ({ name: String(form.get('name')), is_active: form.has('active') }))}>
                  <Input name="name" id={`category-${category.id}`} label="Category name" defaultValue={category.name} required maxLength={80} />
                  <label className="flex gap-2 text-sm"><input defaultChecked={category.is_active} type="checkbox" name="active" /> Available to customers</label>
                  <Button size="sm" variant="outline" type="submit" disabled={change.isPending}>Save category</Button>
                </form>
                <form aria-label={`Rates for ${category.name}`} className="space-y-3"
                  onSubmit={(event) => submit(event, 'update_price', category.id, (form) => ({
                    base_price: Number(form.get('base_price')), service_charge: Number(form.get('service_charge')), per_km_charge: Number(form.get('per_km_charge')),
                  }))}>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {([['base_price', 'Base rate (₹)'], ['service_charge', 'Service charge (₹)'], ['per_km_charge', 'Distance (₹/km)']] as const).map(([field, label]) => (
                      <Input key={field} id={`${category.id}-${field}`} name={field} label={label} type="number" min="0" max="99999999.99" step="0.01" required defaultValue={category[field] ?? 0} />
                    ))}
                  </div>
                  <Button size="sm" variant="outline" type="submit" disabled={change.isPending}>Save default rates</Button>
                </form>
              </div>
            ))}
          </Card>
          <Card id="bookings" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Bookings and simulated payments</h2>
            {!data.bookings.length && <p className={textStyle}>No bookings were found.</p>}
            {data.bookings.map((row) => (
              <div className="border-b border-slate-100 pb-2" key={row.id}>
                <strong>{row.service}</strong><p className="text-sm capitalize text-slate-700">{display(row.request_status)} · {display(row.payment_method)} · {display(row.payment_status)}</p>
                <p className="text-xs text-slate-600">{date.format(new Date(row.requested_at))} · {row.id.slice(0, 8)}</p>
              </div>
            ))}
          </Card>
          <Card id="technicians" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Active technician map</h2>
            <p className={textStyle}>{data.locations.length} online technicians sharing a recent location.</p>
            {data.locations.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowMap(!showMap)} aria-expanded={showMap}>{showMap ? 'Hide map' : 'Show map'}</Button>
            )}
            {showMap && data.locations.length > 0 && <Suspense fallback={<p role="status">Loading map…</p>}><TechnicianMap locations={data.locations} /></Suspense>}
          </Card>
          <Card id="complaints" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Customer complaints</h2>
            {!data.complaints.length && <p className={textStyle}>No complaints were found.</p>}
            {data.complaints.map((complaint) => (
              <div className="space-y-2 border-b border-slate-100 pb-3" key={complaint.id}>
                <p className="whitespace-pre-line break-words text-sm">{complaint.message}</p>
                <p className="text-xs capitalize text-slate-600">{complaint.status} · {date.format(new Date(complaint.created_at))}{complaint.request_id && ` · Request ${complaint.request_id.slice(0, 8)}`}</p>
                <Button size="sm" variant="outline" disabled={change.isPending}
                  onClick={() => { setNotice(null); change.mutate({ action: complaint.status === 'open' ? 'resolve_complaint' : 'reopen_complaint', target: complaint.id, values: {} }) }}>
                  {complaint.status === 'open' ? 'Resolve complaint' : 'Reopen complaint'}
                </Button>
              </div>
            ))}
          </Card>
          <Card id="audit" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Audit history</h2>
            {!data.audit.length && <p className={textStyle}>No administrative actions recorded.</p>}
            <ul className="divide-y divide-slate-100">
              {data.audit.map((event) => <li className="py-2 text-sm capitalize text-slate-700" key={event.id}>
                {display(event.action)} <span className="text-xs text-slate-600">· {date.format(new Date(event.created_at))} · Admin {event.actor_id.slice(0, 8)}{event.target_id && ` · Record ${event.target_id.slice(0, 8)}`}</span>
              </li>)}
            </ul>
          </Card>
          <Card id="settings" className="scroll-mt-5 space-y-4">
            <h2 className={titleStyle}>Platform settings</h2>
            <form className="space-y-3" onSubmit={(event) => submit(event, 'update_settings', null, (form) => ({
              support_email: String(form.get('support-email')), matching_radius_km: Number(form.get('matching-radius')),
            }))}>
              <Input type="email" name="support-email" label="Support email" maxLength={254} defaultValue={data.settings.support_email ?? ''} />
              <Input type="number" name="matching-radius" label="Default matching radius (km)" required min="1" max="100" defaultValue={data.settings.matching_radius_km} />
              <Button size="sm" variant="outline" type="submit" disabled={change.isPending}>Save settings</Button>
            </form>
          </Card>
        </>
      )}
      <ConfirmDialog open={Boolean(confirmation)} title={confirmation?.title ?? ''} description={confirmation?.description ?? ''}
        loading={change.isPending} onClose={() => setConfirmation(null)} onConfirm={() => {
          if (confirmation && !change.isPending) change.mutate(confirmation.change)
        }} />
    </DashboardLayout>
  )
}

export default function AdminDashboardPage() {
  const [client] = useState(() => new QueryClient())
  return <QueryClientProvider client={client}><AdminWorkspace /></QueryClientProvider>
}
