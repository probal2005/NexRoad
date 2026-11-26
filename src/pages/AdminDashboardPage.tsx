import { lazy, Suspense, useState, type SubmitEvent } from 'react'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { Activity, ArrowRight, ClipboardList, Gauge, MapPin, MessageSquareWarning, RefreshCw, Search, Settings, ShieldCheck, SlidersHorizontal, Users, Wrench } from 'lucide-react'

import operationsCover from '../assets/admin-operations.webp'
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
import StatusBadge from '../components/ui/StatusBadge'
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
  ['overview', 'Overview'], ['accounts', 'Accounts'], ['bookings', 'Bookings'],
  ['technicians', 'Technician map'], ['complaints', 'Complaints'], ['services', 'Services and pricing'],
  ['audit', 'Audit history'], ['settings', 'Settings'],
] as const
const date = new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })
const display = (value: string) => value.replaceAll('_', ' ')
const roleLabel = (role: string) => role === 'user' ? 'Customer' : display(role)
const textStyle = 'text-sm text-slate-600'
const sectionStyle = 'scroll-mt-5 space-y-4 sm:p-6'
const nestedCard = 'min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:p-4'
const sectionTitles = {
  overview: ['Overview', Gauge],
  accounts: ['Customers and technicians', Users],
  bookings: ['Bookings and simulated payments', ClipboardList],
  technicians: ['Active technician map', MapPin],
  complaints: ['Customer complaints', MessageSquareWarning],
  services: ['Service categories and pricing', SlidersHorizontal],
  audit: ['Audit history', Activity],
  settings: ['Platform settings', Settings],
} as const

function AdminSectionTitle({ section }: { section: keyof typeof sectionTitles }) {
  const [label, Icon] = sectionTitles[section]
  return (
    <h2 className="flex items-center gap-3 text-lg font-bold text-brand-navy sm:text-xl">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><Icon size={19} aria-hidden /></span>
      {label}
    </h2>
  )
}

function StatusChart({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values)
  const max = Math.max(1, ...entries.map(([, count]) => count))
  return (
    <div className={`${nestedCard} space-y-3`}>
      <h3 className="text-sm font-bold text-brand-navy">{title}</h3>
      {entries.length ? entries.map(([status, count]) => (
        <div key={status}>
          <p className="flex justify-between text-xs capitalize text-slate-700"><span>{display(status)}</span><span>{count}</span></p>
          <div aria-hidden className="mt-1 h-2 rounded bg-slate-200">
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
    `${full_name} ${email ?? ''} ${role} ${roleLabel(role)}`.toLowerCase().includes(accountSearch)) ?? []

  return (
    <DashboardLayout
      title="Admin Dashboard"
      coverImage={operationsCover}
      description="Monitor bookings, review technician applications and manage platform settings."
      status={<LiveConnection status={connection} />}
      sections={data ? sections : undefined}
      actions={(
        <div className="mt-5 flex flex-wrap gap-2.5">
          {data && <a href="#accounts" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-bold text-brand-navy! hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ShieldCheck size={17} aria-hidden /> Review accounts <ArrowRight size={16} aria-hidden />
          </a>}
          <Button variant="outline" className="bg-white" leftIcon={<RefreshCw size={16} aria-hidden />} loading={overview.isFetching} onClick={() => void overview.refetch()}>Refresh dashboard</Button>
        </div>
      )}
      onSignOut={() => void signOut().catch(() => setNotice({ message: 'Could not sign out.', error: true }))}
    >
      {overview.isPending && <p role="status" className={textStyle}>Loading admin overview…</p>}
      {overview.isError && <Alert variant="warning" title="Admin tools are unavailable.">The admin database migration and an active administrator account are required.</Alert>}
      {notice && (
        <div className="fixed right-4 bottom-4 left-4 z-40 sm:left-auto sm:w-96">
          <Alert variant={notice.error ? 'error' : 'success'} title={notice.message} onClose={() => setNotice(null)} />
        </div>
      )}
      {data && (
        <>
          <Card id="overview" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="overview" />
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {([
                ['Customers', data.statistics.customers, Users, 'bg-sky-100 text-sky-800'],
                ['Technicians', data.statistics.technicians, Wrench, 'bg-emerald-100 text-emerald-800'],
                ['Pending applications', data.statistics.pending_applications, ShieldCheck, 'bg-amber-100 text-amber-800'],
                ['Bookings', data.statistics.bookings, ClipboardList, 'bg-violet-100 text-violet-800'],
              ] as const).map(([label, count, Icon, color]) => (
                <div key={label} className={nestedCard}>
                  <span className={`mb-2 grid size-8 place-items-center rounded-lg ${color}`}><Icon size={16} aria-hidden /></span>
                  <dt className={textStyle}>{label}</dt>
                  <dd className="mt-1 text-2xl font-extrabold tabular-nums text-brand-navy">{count}</dd>
                </div>
              ))}
            </dl>
            <div className="grid gap-5 sm:grid-cols-2">
              <StatusChart title="Booking statuses" values={data.statistics.request_statuses} />
              <StatusChart title="Simulated payment statuses" values={data.statistics.payment_statuses} />
            </div>
          </Card>
          <Card id="accounts" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="accounts" />
            <Input name="account-search" label="Filter loaded accounts" placeholder="Search name, email or role" leftIcon={<Search size={17} aria-hidden />} value={search} onChange={(event) => setSearch(event.target.value)} />
            <p className={textStyle}>Up to 100 accounts. Pending applications appear first.</p>
            {visibleAccounts.length === 0 && <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600" role="status">No accounts match this filter.</p>}
            {visibleAccounts.map((account) => (
              <div key={account.id} className={`${nestedCard} flex flex-wrap justify-between gap-3`}>
                <div className="min-w-0 break-words">
                  <h3 className="font-semibold text-brand-navy">{account.full_name || 'Unnamed account'}</h3>
                  <p className={textStyle}>{account.email}</p>
                  {account.application_note && <p className="whitespace-pre-line text-sm text-slate-600">{account.application_note}</p>}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold capitalize text-slate-700">{roleLabel(account.role)}</span>
                    <StatusBadge status={account.suspended ? 'offline' : 'active'} label={account.suspended ? 'Suspended' : 'Active'} />
                    {account.application_status && <StatusBadge
                      status={account.application_status === 'approved' ? 'verified' : account.application_status === 'rejected' ? 'rejected' : 'pending'}
                      label={`Application ${account.application_status}`} />}
                  </div>
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
          <Card id="bookings" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="bookings" />
            {!data.bookings.length && <p className={textStyle}>No bookings were found.</p>}
            <ul className="space-y-2">
              {data.bookings.map((row) => (
                <li className={`${nestedCard} flex flex-wrap items-center justify-between gap-3`} key={row.id}>
                  <div className="min-w-0">
                    <h3 className="font-semibold break-words text-brand-navy">{row.service}</h3>
                    <p className="mt-1 text-xs text-slate-600"><time dateTime={row.requested_at}>{date.format(new Date(row.requested_at))}</time> · {row.id.slice(0, 8)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={row.request_status === 'completed' ? 'completed' : row.request_status === 'cancelled' || row.request_status === 'expired' ? 'cancelled' : 'accepted'}
                      className="capitalize" label={display(row.request_status)} />
                    <StatusBadge status={row.payment_status === 'paid' ? 'paid' : row.payment_status === 'failed' ? 'failed' : 'pending'}
                      className="capitalize" label={`${display(row.payment_method)} · ${display(row.payment_status)}`} />
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Card id="technicians" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="technicians" />
            <p className={nestedCard}>{data.locations.length} online technicians sharing a recent location.</p>
            {data.locations.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setShowMap(!showMap)} aria-expanded={showMap}>{showMap ? 'Hide map' : 'Show map'}</Button>
            )}
            {showMap && data.locations.length > 0 && <Suspense fallback={<p role="status">Loading map…</p>}><TechnicianMap locations={data.locations} /></Suspense>}
          </Card>
          <Card id="complaints" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="complaints" />
            {!data.complaints.length && <p className={textStyle}>No complaints were found.</p>}
            {data.complaints.map((complaint) => (
              <div className={`${nestedCard} space-y-3`} key={complaint.id}>
                <p className="whitespace-pre-line break-words text-sm">{complaint.message}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={complaint.status === 'open' ? 'pending' : 'completed'} className="capitalize" label={complaint.status} />
                  <p className="text-xs text-slate-600"><time dateTime={complaint.created_at}>{date.format(new Date(complaint.created_at))}</time>{complaint.request_id && ` · Request ${complaint.request_id.slice(0, 8)}`}</p>
                </div>
                <Button size="sm" variant="outline" disabled={change.isPending}
                  onClick={() => { setNotice(null); change.mutate({ action: complaint.status === 'open' ? 'resolve_complaint' : 'reopen_complaint', target: complaint.id, values: {} }) }}>
                  {complaint.status === 'open' ? 'Resolve complaint' : 'Reopen complaint'}
                </Button>
              </div>
            ))}
          </Card>
          <Card id="services" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="services" />
            <p className={textStyle}>Rates are used for new customer quotes. Confirmed booking prices stay fixed.</p>
            <AdminFuelPrices adminId={user?.id} />
            {data.categories.map((category) => (
              <div key={category.id} className={`${nestedCard} @container space-y-4`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-bold text-brand-navy">{category.name}</h3>
                  <StatusBadge status={category.is_active ? 'active' : 'offline'} label={category.is_active ? 'Available' : 'Unavailable'} />
                </div>
                <form aria-label={`Category ${category.name}`} className="space-y-3"
                  onSubmit={(event) => submit(event, 'update_category', category.id, (form) => ({ name: String(form.get('name')), is_active: form.has('active') }))}>
                  <Input name="name" id={`category-${category.id}`} label="Category name" defaultValue={category.name} required maxLength={80} />
                  <label className="flex min-h-11 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700">
                    <input className="size-4 accent-emerald-700" defaultChecked={category.is_active} type="checkbox" name="active" /> Available to customers
                  </label>
                  <Button size="sm" variant="outline" type="submit" disabled={change.isPending}>Save category</Button>
                </form>
                <form aria-label={`Rates for ${category.name}`} className="space-y-3 border-t border-slate-200 pt-4"
                  onSubmit={(event) => submit(event, 'update_price', category.id, (form) => ({
                    base_price: Number(form.get('base_price')), service_charge: Number(form.get('service_charge')), per_km_charge: Number(form.get('per_km_charge')),
                  }))}>
                  <div className="grid gap-3 @lg:grid-cols-3">
                    {([['base_price', 'Base rate (₹)'], ['service_charge', 'Service charge (₹)'], ['per_km_charge', 'Distance (₹/km)']] as const).map(([field, label]) => (
                      <Input key={field} id={`${category.id}-${field}`} name={field} label={label} type="number" min="0" max="99999999.99" step="0.01" required defaultValue={category[field] ?? 0} />
                    ))}
                  </div>
                  <Button size="sm" variant="outline" type="submit" disabled={change.isPending}>Save default rates</Button>
                </form>
              </div>
            ))}
          </Card>
          <Card id="audit" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="audit" />
            {!data.audit.length && <p className={textStyle}>No administrative actions recorded.</p>}
            <ul className="space-y-2">
              {data.audit.map((event) => <li className={`${nestedCard} text-sm capitalize text-slate-700`} key={event.id}>
                {display(event.action)} <span className="text-xs text-slate-600">· {date.format(new Date(event.created_at))} · Admin {event.actor_id.slice(0, 8)}{event.target_id && ` · Record ${event.target_id.slice(0, 8)}`}</span>
              </li>)}
            </ul>
          </Card>
          <Card id="settings" padding="sm" className={sectionStyle}>
            <AdminSectionTitle section="settings" />
            <form aria-label="Platform settings" className={`${nestedCard} @container space-y-4`} onSubmit={(event) => submit(event, 'update_settings', null, (form) => ({
              support_email: String(form.get('support-email')), matching_radius_km: Number(form.get('matching-radius')),
            }))}>
              <div className="grid gap-4 @md:grid-cols-2">
                <Input type="email" name="support-email" label="Support email" maxLength={254} defaultValue={data.settings.support_email ?? ''} />
                <Input type="number" name="matching-radius" label="Default matching radius (km)" required min="1" max="100" defaultValue={data.settings.matching_radius_km} />
              </div>
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
