import { lazy, Suspense, useState, type SubmitEvent } from 'react'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowRight, CarFront, ClipboardList, Crosshair, LifeBuoy, MapPin } from 'lucide-react'

import roadsideCover from '../assets/customer-roadside.webp'
import type { UserProfile } from '../auth/AuthContext'
import { useAuth } from '../auth/useAuth'
import BookingPrice from '../components/common/BookingPrice'
import { readBookingQuote, type BookingQuote } from '../lib/bookingPricing'
import LiveConnection from '../components/common/LiveConnection'
import { useDashboardRealtime } from '../lib/useDashboardRealtime'
import DashboardLayout from '../components/layout/DashboardLayout'
import CustomerRequests from '../components/common/CustomerRequests'
import type { TowFollowup } from '../components/common/CustomerServiceWorkflow'
import CustomerSettings from '../components/common/CustomerSettings'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import type { Database, Json } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type Tables = Database['public']['Tables']
type Vehicle = Pick<Tables['vehicles']['Row'], 'id' | 'make' | 'model' | 'vehicle_type' | 'registration_number'>
type Category = Pick<Tables['service_categories']['Row'], 'id' | 'name' | 'slug'>

const PickupMap = lazy(() => import('../components/common/PickupMap'))

const vehicleFields = 'id, make, model, vehicle_type, registration_number'
function field(data: FormData, name: string) {
  return String(data.get(name) ?? '').trim()
}

function RequestForm({ customerId, categories, vehicles, followup, onLeaveFollowup }: {
  customerId: string
  categories: Category[]
  vehicles: Vehicle[]
  followup: TowFollowup | null
  onLeaveFollowup: () => void
}) {
  const client = useQueryClient()
  const [locationError, setLocationError] = useState('')
  const [locating, setLocating] = useState(false)
  const [latitude, setLatitude] = useState(followup ? String(followup.latitude) : '')
  const [longitude, setLongitude] = useState(followup ? String(followup.longitude) : '')
  const [showMap, setShowMap] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [categoryId, setCategoryId] = useState(followup ? categories.find(({ slug }) => slug === 'towing')?.id ?? '' : '')
  const [draft, setDraft] = useState<{ id: string; input: Json; quote: BookingQuote; address: string } | null>(null)
  const category = categories.find(({ id }) => id === categoryId)
  const estimate = useMutation({
    mutationFn: async (input: Json) => {
      const { data, error } = await supabase.rpc('quote_booking', { p_input: input })
      if (error) throw error
      const quote = readBookingQuote(data)
      if (!quote) throw new Error('Quote unavailable')
      return quote
    },
  })
  const lat = Number(latitude)
  const lng = Number(longitude)
  const position: [number, number] | null = latitude && longitude
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
  const request = useMutation({
    mutationFn: async (booking: NonNullable<typeof draft>) => {
      const args = { p_request_id: booking.id, p_input: booking.input, p_expected_quote: booking.quote }
      const { data, error } = followup
        ? await supabase.rpc('create_towing_followup', { ...args, p_parent_request_id: followup.id })
        : await supabase.rpc('create_priced_booking', args)
      if (error) throw error
      if (!data) throw new Error('Booking unavailable')
    },
    onSuccess: () => Promise.all([
      client.invalidateQueries({ queryKey: ['customer-requests', customerId] }),
      client.invalidateQueries({ queryKey: ['customer-request-updates', customerId] }),
    ]),
  })

  function selectPickup(lat: number, lng: number) {
    setLatitude(lat.toFixed(6))
    setLongitude(lng.toFixed(6))
    setLocationError('')
  }

  function locate() {
    setLocationError('')
    if (!navigator.geolocation) {
      setLocationError('Location access is unavailable. Enter coordinates below.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        selectPickup(coords.latitude, coords.longitude)
        setLocating(false)
      },
      () => {
        setLocationError('Could not read your location. Enter coordinates below.')
        setLocating(false)
      },
      { timeout: 10000 },
    )
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (request.isPending || estimate.isPending || draft) return
    const form = event.currentTarget
    const data = new FormData(form)
    const address = field(data, 'service-location')
    if (address.length < 3) {
      setLocationError('Enter a location with at least three characters.')
      return
    }
    if (!position) {
      setLocationError('Choose a pickup point or enter valid coordinates.')
      return
    }
    setLocationError('')
    const notes = field(data, 'request-description')
    const detail = field(data, 'service-detail')
    const fuelQuantity = field(data, 'fuel-quantity')
    if (!category || (category.slug === 'mechanical' && !notes) || (category.slug === 'towing' && !detail)) {
      setLocationError('Complete the required service details.')
      return
    }
    const input: Json = {
      category_id: categoryId,
      vehicle_id: field(data, 'request-vehicle') || null,
      service_location: address,
      latitude: position[0],
      longitude: position[1],
      issue_description: notes || null,
      payment_method: field(data, 'booking-payment-method'),
      fuel_type: category.slug === 'fuel' ? detail : null,
      fuel_litres: category.slug === 'fuel' ? Number(fuelQuantity) : null,
      destination: category.slug === 'towing' ? detail : null,
      destination_latitude: category.slug === 'towing' ? Number(field(data, 'destination-latitude')) : null,
      destination_longitude: category.slug === 'towing' ? Number(field(data, 'destination-longitude')) : null,
    }
    request.reset()
    estimate.mutate(input, {
      onSuccess: (quote) => setDraft({ id: crypto.randomUUID(), input, quote, address }),
    })
  }

  return (
    <form key={formVersion} className="mt-5 space-y-4" onSubmit={submit}>
      {followup && <Alert title="Follow-up towing">
        Pickup is copied from the mechanical booking. <Button size="sm" variant="ghost" disabled={request.isPending} onClick={onLeaveFollowup}>Exit follow-up</Button>
      </Alert>}
      <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 px-3 pb-4 sm:px-4">
        <legend className="px-2 text-sm font-bold text-brand-navy">Service and vehicle</legend>
        <Select name="service-category" disabled={Boolean(followup)} label="Service" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={categories.map(({ id, name }) => ({ value: id, label: name }))} />
        <Select name="request-vehicle" label="Vehicle (optional)" placeholder="Continue without a saved vehicle"
          options={vehicles.map(({ id, make, model }) => ({ value: id, label: `${make} ${model}` }))} />
      </fieldset>
      <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 px-3 pb-4 sm:px-4">
        <legend className="px-2 text-sm font-bold text-brand-navy">Pickup location</legend>
        <Input name="service-location" label="Pickup address or landmark" defaultValue={followup?.address} readOnly={Boolean(followup)} required minLength={3} maxLength={500} placeholder="e.g. Sector 17 bus stand, Chandigarh" />
        {!followup && <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" loading={locating} onClick={locate} leftIcon={<Crosshair size={15} />}>Use my location</Button>
          <Button variant="outline" size="sm" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>
            {showMap ? 'Hide pickup map' : 'Choose on map'}
          </Button>
        </div>}
        {showMap && (
          <>
            <p className="text-sm text-slate-600">Click the map to set the pickup point, or enter coordinates below.</p>
            <Suspense fallback={<p role="status">Loading pickup map…</p>}>
              <PickupMap position={position} onSelect={selectPickup} />
            </Suspense>
          </>
        )}
        <div className="grid gap-3 min-[420px]:grid-cols-2">
          <Input name="latitude" label="Latitude" readOnly={Boolean(followup)} type="number" required min={-90} max={90} step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
          <Input name="longitude" label="Longitude" readOnly={Boolean(followup)} type="number" required min={-180} max={180} step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
        </div>
      </fieldset>
      <fieldset className="min-w-0 space-y-3 rounded-xl border border-slate-200 px-3 pb-4 sm:px-4">
        <legend className="px-2 text-sm font-bold text-brand-navy">Service details and payment</legend>
        {category?.slug === 'fuel' && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Select name="service-detail" label="Fuel type" required options={[
              { label: 'Petrol', value: 'Petrol' },
              { label: 'Diesel', value: 'Diesel' },
            ]} />
            <Input name="fuel-quantity" label="Fuel quantity (litres)" type="number" min={1} max={50} step="0.01" required />
          </div>
        )}
        {category?.slug === 'towing' && (
          <div className="space-y-3">
            <Input key="tow-destination" name="service-detail" label="Tow destination" minLength={3} maxLength={500} required />
            <div className="grid gap-3 min-[420px]:grid-cols-2">
              <Input name="destination-latitude" label="Drop-off latitude" type="number" required min={-90} max={90} step="any" />
              <Input name="destination-longitude" label="Drop-off longitude" type="number" required min={-180} max={180} step="any" />
            </div>
          </div>
        )}
        <Textarea name="request-description" label={category?.slug === 'mechanical' ? 'Describe the mechanical issue' : 'Additional details (optional)'}
          required={category?.slug === 'mechanical'} maxLength={2000} rows={3} />
        <Select name="booking-payment-method" label="Payment method after service" required defaultValue="cash" options={[
          { value: 'cash', label: 'Cash (simulated)' },
          { value: 'online', label: 'Online (simulated)' },
        ]} />
      </fieldset>
      {estimate.isError && <Alert variant="error" title="Could not calculate an estimate. Check the service details and try again." />}
      {locationError && <Alert variant="error" title={locationError} />}

      {request.isSuccess && <Alert variant="success" title="Request submitted." />}
      <Button type="submit" loading={estimate.isPending || request.isPending} disabled={!categories.length || draft !== null} rightIcon={<ArrowRight size={16} aria-hidden />}>Review price</Button>
      <ConfirmDialog open={draft !== null} title="Confirm assistance request"
        description={`${category?.name ?? 'Roadside assistance'} at ${draft?.address ?? ''}. This quote is stored when you book.`}
        confirmLabel="Send request" cancelLabel="Keep editing" loading={request.isPending}
        onClose={() => setDraft(null)} onConfirm={() => {
          if (!draft || request.isPending) return
          request.mutate(draft, {
            onSuccess: () => {
              setDraft(null)
              if (followup) onLeaveFollowup()
              setFormVersion((version) => version + 1)
              setCategoryId('')
              setLatitude('')
              setLongitude('')
            },
            onError: (error) => {
              if (error && typeof error === 'object' && 'code' in error && error.code === '22023') {
                setDraft(null)
                setLocationError('The price changed. Review the new quote and confirm again.')
              }
            },
          })
        }}>
        {draft && <BookingPrice quote={draft.quote} />}
        {request.isError && <Alert variant="error" title="Could not submit your request. Try again or keep editing." />}
      </ConfirmDialog>
    </form>
  )
}

function VehicleForm({ customerId, editing, onCancel, onSaved }: {
  customerId: string
  editing: Vehicle | null
  onCancel: () => void
  onSaved: () => void
}) {
  const client = useQueryClient()
  const [validation, setValidation] = useState('')
  const vehicle = useMutation({
    mutationFn: async (values: Omit<Tables['vehicles']['Insert'], 'owner_id'>) => {
      if (editing) {
        const { error } = await supabase.from('vehicles').update(values)
          .eq('id', editing.id).eq('owner_id', customerId).select('id').single()
        if (error) throw error
        return
      }
      const { error } = await supabase.from('vehicles').insert({ ...values, owner_id: customerId })
      if (error) throw error
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['customer-vehicles', customerId] }),
  })

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (vehicle.isPending) return
    const form = event.currentTarget
    const data = new FormData(form)
    const make = field(data, 'vehicle-make')
    const model = field(data, 'vehicle-model')
    if (!make || !model) {
      setValidation('Enter a make and model.')
      return
    }
    setValidation('')
    vehicle.mutate({
      make,
      model,
      vehicle_type: field(data, 'vehicle-type'),
      registration_number: field(data, 'vehicle-registration') || null,
    }, {
      onSuccess: () => {
        form.reset()
        onSaved()
      },
    })
  }

  return (
    <form className="mt-5 space-y-4 border-t border-slate-200 pt-5" onSubmit={submit}>
      <h3 className="font-semibold text-brand-navy">{editing ? `Edit ${editing.make} ${editing.model}` : 'Add a vehicle'}</h3>
      <Select name="vehicle-type" label="Vehicle type" required defaultValue={editing?.vehicle_type ?? ''} options={[
        { value: 'car', label: 'Car' },
        { value: 'motorcycle', label: 'Motorcycle' },
        { value: 'other', label: 'Other' },
      ]} />
      <div className="grid gap-3 min-[420px]:grid-cols-2">
        <Input name="vehicle-make" label="Make" required maxLength={60} defaultValue={editing?.make} />
        <Input name="vehicle-model" label="Model" required maxLength={60} defaultValue={editing?.model} />
      </div>
      <Input name="vehicle-registration" label="Registration number (optional)" maxLength={30} defaultValue={editing?.registration_number ?? ''} />
      {validation && <Alert variant="error" title={validation} />}
      {vehicle.isError && <Alert variant="error" title="Could not save your vehicle." />}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" variant="outline" loading={vehicle.isPending}>Save vehicle</Button>
        {editing && <Button variant="ghost" disabled={vehicle.isPending} onClick={onCancel}>Cancel edit</Button>}
      </div>
    </form>
  )
}

function CustomerDashboard({ profile }: { profile: UserProfile }) {
  const { signOut, user } = useAuth()
  const customerId = profile.id
  const connection = useDashboardRealtime('customer', customerId)
  const [customerSettings, setCustomerSettings] = useState({ full_name: profile.full_name, phone: profile.phone })
  const client = useQueryClient()
  const [editing, setEditing] = useState<Vehicle | null>(null)
  const [removing, setRemoving] = useState<Vehicle | null>(null)
  const [vehicleNotice, setVehicleNotice] = useState('')
  const removeVehicle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vehicles').delete()
        .eq('id', id).eq('owner_id', customerId).select('id').single()
      if (error) throw error
    },
    onSuccess: (_, id) => {
      setEditing((current) => current?.id === id ? null : current)
      setRemoving(null)
      setVehicleNotice('Vehicle removed.')
      void client.invalidateQueries({ queryKey: ['customer-vehicles', customerId] })
    },
    onError: () => setRemoving(null),
  })
  const [signOutError, setSignOutError] = useState(false)
  const categories = useQuery({
    queryKey: ['service-categories'],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('service_categories').select('id, name, slug, is_active').order('name').abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const vehicles = useQuery({
    queryKey: ['customer-vehicles', customerId],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('vehicles').select(vehicleFields).eq('owner_id', customerId).order('created_at', { ascending: false }).abortSignal(signal)
      if (error) throw error
      return data
    },
  })
  const [followup, setFollowup] = useState<TowFollowup | null>(null)
  const [towUnavailable, setTowUnavailable] = useState(false)
  const activeCategories = (categories.data ?? []).filter((category) => category.is_active)

  function startTowFollowup(booking: TowFollowup) {
    setTowUnavailable(!activeCategories.some(({ slug }) => slug === 'towing'))
    if (!activeCategories.some(({ slug }) => slug === 'towing')) return
    setFollowup(booking)
    window.requestAnimationFrame(() => document.getElementById('request-assistance')?.scrollIntoView())
  }

  return (
    <DashboardLayout
      title="User Dashboard"
      coverImage={roadsideCover}
      actions={(
        <div className="mt-5 flex flex-wrap gap-2.5">
          <a href="#request-assistance" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-green px-4 text-sm font-bold text-brand-navy! hover:bg-emerald-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <LifeBuoy size={17} aria-hidden /> Start a request <ArrowRight size={16} aria-hidden />
          </a>
          <a href="#active-requests" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/50 bg-brand-navy/70 px-4 text-sm font-semibold text-white hover:bg-brand-navy focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
            <ClipboardList size={17} aria-hidden /> Track requests
          </a>
        </div>
      )}
      description={`Welcome, ${customerSettings.full_name || 'NexRoad member'}. Book roadside assistance and track your requests here.`}
      status={<LiveConnection status={connection} />}
      onSignOut={() => void signOut().catch(() => setSignOutError(true))}
      sections={[
        ['request-assistance', 'Request assistance'], ['active-requests', 'Active requests'],
        ['request-updates', 'Updates'], ['request-history', 'History'],
        ['saved-vehicles', 'Saved vehicles'], ['customer-settings', 'Settings'],
      ]}
      secondaryLink={{ to: '/technician/application', label: 'Technician application' }}
    >
      {signOutError && <Alert variant="error" title="Could not sign out. Please try again." />}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card id="request-assistance" className="min-w-0 scroll-mt-4 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-800"><MapPin size={21} aria-hidden /></span>
            <div>
              <h2 className="text-xl font-bold text-brand-navy">Request assistance</h2>
              <p className="mt-1 text-sm text-slate-600">Choose a service and review your quote before booking.</p>
            </div>
          </div>
          {towUnavailable && <Alert variant="warning" title="Towing is currently unavailable." />}
          {categories.isPending && <p className="mt-4 text-slate-600" role="status">Loading services…</p>}
          {categories.isError && <div className="mt-4"><Alert variant="error" title="Could not load services."><Button size="sm" variant="outline" onClick={() => void categories.refetch()}>Retry services</Button></Alert></div>}
          {categories.isSuccess && (activeCategories.length
            ? <RequestForm key={followup?.id ?? 'new'} customerId={customerId} categories={activeCategories}
              vehicles={vehicles.data ?? []} followup={followup} onLeaveFollowup={() => setFollowup(null)} />
            : <p className="mt-4 text-slate-600">No services are currently available.</p>)}
        </Card>
        <div className="min-w-0 space-y-6">
          <CustomerRequests customerId={customerId} categories={categories.data ?? []} onTowFollowup={startTowFollowup} />
          <Card id="saved-vehicles" className="scroll-mt-4 p-4 sm:p-6">
            <h2 className="flex items-center gap-3 text-xl font-bold text-brand-navy">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-sky-800"><CarFront size={20} aria-hidden /></span>
              Saved vehicles
            </h2>
            {vehicles.isPending && <p className="mt-4 text-slate-600" role="status">Loading vehicles…</p>}
            {vehicles.isError && <div className="mt-4"><Alert variant="error" title="Could not load your vehicles."><Button size="sm" variant="outline" onClick={() => void vehicles.refetch()}>Retry vehicles</Button></Alert></div>}
            {vehicles.isSuccess && (vehicles.data.length ? (
              <ul className="mt-3 divide-y divide-slate-200">
                {vehicles.data.map((vehicle) => (
                  <li key={vehicle.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div><p className="font-semibold text-brand-navy">{vehicle.make} {vehicle.model}</p>
                    <p className="text-sm text-slate-600">{vehicle.registration_number ?? vehicle.vehicle_type}</p></div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" aria-label={`Edit ${vehicle.make} ${vehicle.model}`} onClick={() => {
                        setVehicleNotice('')
                        setEditing(vehicle)
                      }}>Edit</Button>
                      <Button size="sm" variant="ghost" aria-label={`Remove ${vehicle.make} ${vehicle.model}`} onClick={() => {
                        removeVehicle.reset()
                        setVehicleNotice('')
                        setRemoving(vehicle)
                      }}>Remove</Button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <p className="mt-4 text-slate-600">You haven’t saved a vehicle yet.</p>)}
            {removeVehicle.isError && <Alert variant="error" title="Could not remove your vehicle." />}
            {vehicleNotice && <Alert variant="success" title={vehicleNotice} />}
            <VehicleForm key={editing?.id ?? 'new'} customerId={customerId} editing={editing}
              onCancel={() => setEditing(null)} onSaved={() => {
                setEditing(null)
                setVehicleNotice('Vehicle saved.')
              }} />
            <ConfirmDialog open={removing !== null} title="Remove saved vehicle?"
              description={`Remove ${removing?.make ?? ''} ${removing?.model ?? ''} from your saved vehicles? Existing requests will stay in your history.`}
              confirmLabel="Remove vehicle" variant="danger" loading={removeVehicle.isPending}
              onClose={() => setRemoving(null)} onConfirm={() => {
                if (removing) removeVehicle.mutate(removing.id)
              }} />
          </Card>
          <CustomerSettings profile={{ ...profile, ...customerSettings }} email={user?.email ?? ''} onSaved={setCustomerSettings} />
        </div>
      </div>
    </DashboardLayout>
  )
}

export default function CustomerDashboardPage() {
  const { profile } = useAuth()
  const [client] = useState(() => new QueryClient())

  if (!profile) return null
  return (
    <QueryClientProvider client={client}>
      <CustomerDashboard key={profile.id} profile={profile} />
    </QueryClientProvider>
  )
}
