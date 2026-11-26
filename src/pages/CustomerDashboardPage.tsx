import { lazy, Suspense, useState, type SubmitEvent } from 'react'
import { QueryClient, QueryClientProvider, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CarFront, Crosshair, LifeBuoy } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { UserProfile } from '../auth/AuthContext'
import { useAuth } from '../auth/useAuth'
import BrandLogo from '../components/common/BrandLogo'
import CustomerRequests from '../components/common/CustomerRequests'
import CustomerSettings from '../components/common/CustomerSettings'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import Input from '../components/ui/Input'
import Select from '../components/ui/Select'
import Textarea from '../components/ui/Textarea'
import type { Database } from '../lib/database.types'
import { supabase } from '../lib/supabase'

type Tables = Database['public']['Tables']
type Vehicle = Pick<Tables['vehicles']['Row'], 'id' | 'make' | 'model' | 'vehicle_type' | 'registration_number'>
type Category = Pick<Tables['service_categories']['Row'], 'id' | 'name' | 'slug'>

const PickupMap = lazy(() => import('../components/common/PickupMap'))

const vehicleFields = 'id, make, model, vehicle_type, registration_number'
function field(data: FormData, name: string) {
  return String(data.get(name) ?? '').trim()
}

function RequestForm({ customerId, categories, vehicles }: {
  customerId: string
  categories: Category[]
  vehicles: Vehicle[]
}) {
  const client = useQueryClient()
  const [locationError, setLocationError] = useState('')
  const [locating, setLocating] = useState(false)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [showMap, setShowMap] = useState(false)
  const [formVersion, setFormVersion] = useState(0)
  const [categoryId, setCategoryId] = useState('')
  const [draft, setDraft] = useState<Tables['service_requests']['Insert'] | null>(null)
  const category = categories.find(({ id }) => id === categoryId)
  const estimate = useQuery({
    queryKey: ['service-starting-price', categoryId],
    enabled: Boolean(category),
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.from('technician_services')
        .select('base_price, service_charge').eq('category_id', categoryId)
        .eq('is_active', true).abortSignal(signal)
      if (error) throw error
      return data.reduce<number | null>((lowest, rate) => {
        const amount = rate.base_price + rate.service_charge
        return lowest === null ? amount : Math.min(lowest, amount)
      }, null)
    },
  })
  const lat = Number(latitude)
  const lng = Number(longitude)
  const position: [number, number] | null = latitude && longitude
    && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null
  const request = useMutation({
    mutationFn: async (values: Tables['service_requests']['Insert']) => {
      const { error } = await supabase.from('service_requests').insert(values)
      if (error) throw error
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
    if (request.isPending) return
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
    const serviceDetails = [
      category?.slug === 'fuel' && `Fuel: ${detail}, ${fuelQuantity} L`,
      category?.slug === 'towing' && `Tow destination: ${detail}`,
      notes,
    ].filter(Boolean).join('\n')
    if (serviceDetails.length > 2000) {
      setLocationError('Shorten the request details to 2,000 characters or fewer.')
      return
    }
    setDraft({
      customer_id: customerId,
      category_id: categoryId,
      vehicle_id: field(data, 'request-vehicle') || null,
      service_location: address,
      latitude: position[0],
      longitude: position[1],
      issue_description: serviceDetails || null,
    })
  }

  return (
    <form key={formVersion} className="mt-5 space-y-4" onSubmit={submit}>
      <Select name="service-category" label="Service" required value={categoryId} onChange={(event) => setCategoryId(event.target.value)} options={categories.map(({ id, name }) => ({ value: id, label: name }))} />
      <Select name="request-vehicle" label="Vehicle (optional)" placeholder="Continue without a saved vehicle"
        options={vehicles.map(({ id, make, model }) => ({ value: id, label: `${make} ${model}` }))} />
      <Input name="service-location" label="Pickup address or landmark" required minLength={3} maxLength={500} placeholder="e.g. Sector 17 bus stand, Chandigarh" />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" loading={locating} onClick={locate} leftIcon={<Crosshair size={15} />}>Use my location</Button>
        <Button variant="outline" size="sm" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>
          {showMap ? 'Hide pickup map' : 'Choose on map'}
        </Button>
      </div>
      {showMap && (
        <>
          <p className="text-sm text-slate-600">Click the map to set the pickup point, or enter coordinates below.</p>
          <Suspense fallback={<p role="status">Loading pickup map…</p>}>
            <PickupMap position={position} onSelect={selectPickup} />
          </Suspense>
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Input name="latitude" label="Latitude" type="number" required min={-90} max={90} step="any" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
        <Input name="longitude" label="Longitude" type="number" required min={-180} max={180} step="any" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
      </div>
      {category?.slug === 'fuel' && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Select name="service-detail" label="Fuel type" required options={[
            { label: 'Petrol', value: 'Petrol' },
            { label: 'Diesel', value: 'Diesel' },
          ]} />
          <Input name="fuel-quantity" label="Fuel quantity (litres)" type="number" min={1} step={1} required />
        </div>
      )}
      {category?.slug === 'towing' && <Input key="tow-destination" name="service-detail" label="Tow destination" maxLength={500} required />}
      <Textarea name="request-description" label={category?.slug === 'mechanical' ? 'Describe the mechanical issue' : 'Additional details (optional)'}
        required={category?.slug === 'mechanical'} maxLength={2000} rows={3} />
      {category && (
        <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600" role="status">
          {estimate.isPending ? 'Checking listed service rates…' : estimate.data == null || estimate.isError
            ? 'An estimate is unavailable for this service.'
            : `Indicative starting rate ${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(estimate.data)}. Distance, fuel and extras are priced separately.`}
        </p>
      )}
      {locationError && <Alert variant="error" title={locationError} />}
      {request.isError && <Alert variant="error" title="Could not submit your request." />}
      {request.isSuccess && <Alert variant="success" title="Request submitted." />}
      <Button type="submit" loading={request.isPending} disabled={!categories.length}>Review request</Button>
      <ConfirmDialog open={draft !== null} title="Confirm assistance request"
        description={`${category?.name ?? 'Roadside assistance'} at ${draft?.service_location ?? ''}. Send this simulation request?`}
        confirmLabel="Send request" cancelLabel="Keep editing" loading={request.isPending}
        onClose={() => setDraft(null)} onConfirm={() => {
          if (!draft || request.isPending) return
          request.mutate(draft, {
            onSuccess: () => {
              setDraft(null)
              setFormVersion((version) => version + 1)
              setCategoryId('')
              setLatitude('')
              setLongitude('')
            },
            onError: () => setDraft(null),
          })
        }} />
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
      <div className="grid grid-cols-2 gap-3">
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
  const activeCategories = (categories.data ?? []).filter((category) => category.is_active)
  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo />
          <Button variant="outline" size="sm" onClick={() => void signOut().catch(() => setSignOutError(true))}>Sign out</Button>
        </div>
      </header>
      <div className="mx-auto max-w-6xl space-y-6 px-4 py-8 sm:px-6">
        <div>
          <h1 className="text-3xl font-extrabold text-brand-navy">User Dashboard</h1>
          <p className="mt-1 text-slate-600">Welcome, {customerSettings.full_name || 'NexRoad member'}.</p>
        </div>
        <nav aria-label="Dashboard sections" className="flex flex-wrap gap-x-5 gap-y-2 text-sm font-semibold text-emerald-800">
          <a href="#request-assistance" className="hover:underline">Request assistance</a>
          <a href="#active-requests" className="hover:underline">Active requests</a>
          <a href="#request-updates" className="hover:underline">Updates</a>
          <a href="#request-history" className="hover:underline">History</a>
          <a href="#saved-vehicles" className="hover:underline">Saved vehicles{vehicles.data ? ` (${vehicles.data.length})` : ''}</a>
          <a href="#customer-settings" className="hover:underline">Settings</a>
          <Link to="/technician/application" className="hover:underline">Technician application</Link>
        </nav>
        {signOutError && <Alert variant="error" title="Could not sign out. Please try again." />}
        <div className="grid items-start gap-6 lg:grid-cols-[1fr_1fr]">
          <Card id="request-assistance" className="scroll-mt-4">
            <h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy"><LifeBuoy size={21} /> Request assistance</h2>
            {categories.isPending && <p className="mt-4 text-slate-600" role="status">Loading services…</p>}
            {categories.isError && <div className="mt-4"><Alert variant="error" title="Could not load services."><Button size="sm" variant="outline" onClick={() => void categories.refetch()}>Retry services</Button></Alert></div>}
            {categories.isSuccess && (activeCategories.length
              ? <RequestForm customerId={customerId} categories={activeCategories} vehicles={vehicles.data ?? []} />
              : <p className="mt-4 text-slate-600">No services are currently available.</p>)}
          </Card>
          <div className="space-y-6">
            <CustomerRequests customerId={customerId} categories={categories.data ?? []} />
            <Card id="saved-vehicles" className="scroll-mt-4">
              <h2 className="flex items-center gap-2 text-xl font-bold text-brand-navy"><CarFront size={21} /> Saved vehicles</h2>
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
      </div>
    </main>
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
