import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CarFront, ShieldCheck, Wrench } from 'lucide-react'

import BrandLogo from '../components/common/BrandLogo'
import Alert from '../components/ui/Alert'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import StatusBadge from '../components/ui/StatusBadge'
import NotFoundPage from './NotFoundPage'

const previews = {
  customer: {
    name: 'Customer',
    icon: CarFront,
    heading: 'Fuel delivery',
    details: 'Sector 17, Chandigarh · Sample vehicle: Tata Nexon',
    before: 'Ready to request',
    after: 'Request received',
    action: 'Send sample request',
  },
  technician: {
    name: 'Technician',
    icon: Wrench,
    heading: 'Incoming towing offer',
    details: 'Sector 22, Chandigarh · Sample pickup 3 km away',
    before: 'Offer pending',
    after: 'Offer accepted',
    action: 'Accept sample offer',
  },
  admin: {
    name: 'Admin',
    icon: ShieldCheck,
    heading: 'Technician application',
    details: 'Sample technician · Mechanical assistance and towing',
    before: 'Review pending',
    after: 'Application approved',
    action: 'Approve sample application',
  },
}

type PreviewRole = keyof typeof previews

function DemoScenario({ role }: { role: PreviewRole }) {
  const [acted, setActed] = useState(false)
  const preview = previews[role]
  const Icon = preview.icon

  return (
    <Card className="mt-6 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="rounded-xl bg-emerald-100 p-3 text-emerald-800"><Icon aria-hidden size={22} /></span>
          <div>
            <h2 className="font-bold text-brand-navy">{preview.heading}</h2>
            <p className="text-sm text-slate-600">{preview.details}</p>
          </div>
        </div>
        <StatusBadge role="status" status={acted ? 'completed' : 'pending'} label={acted ? preview.after : preview.before} />
      </div>
      <div className="flex flex-wrap gap-3">
        {acted
          ? <Button variant="outline" onClick={() => setActed(false)}>Reset sample</Button>
          : <Button onClick={() => setActed(true)}>{preview.action}</Button>}
      </div>
    </Card>
  )
}

export default function DemoPreviewPage() {
  const { role } = useParams()
  if (role !== 'customer' && role !== 'technician' && role !== 'admin') return <NotFoundPage />

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <BrandLogo size="sm" showTagline={false} />
          <Link to="/login" className="text-sm font-semibold text-emerald-800 hover:underline">Back to sign in</Link>
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <h1 className="mb-4 text-3xl font-extrabold text-brand-navy">{previews[role].name} demo</h1>
        <Alert title="Preview with sample data">Actions run in this browser and reset when you leave. Your live account and requests are separate.</Alert>
        <nav aria-label="Demo roles" className="mt-5 flex flex-wrap gap-3">
          {(['customer', 'technician', 'admin'] as const).map((option) => (
            <Link key={option} to={`/demo/${option}`} aria-current={option === role ? 'page' : undefined}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${option === role ? 'bg-brand-navy text-white' : 'border border-slate-300 bg-white text-brand-navy hover:bg-slate-100'}`}>
              {previews[option].name}
            </Link>
          ))}
        </nav>
        <DemoScenario key={role} role={role} />
      </div>
    </main>
  )
}
