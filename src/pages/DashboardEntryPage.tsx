import { Link } from 'react-router-dom'
import { ShieldCheck, UserRound, Wrench } from 'lucide-react'

import { useAuth } from '../auth/useAuth'
import Card from '../components/ui/Card'

const roleDetails = {
  user: {
    title: 'User Dashboard',
    description: 'Your NexRoad account and roadside assistance workspace.',
    icon: UserRound,
  },
  technician: {
    title: 'Technician Dashboard',
    description: 'Your technician workspace for service requests and availability.',
    icon: Wrench,
  },
  admin: {
    title: 'Admin Dashboard',
    description: 'Your NexRoad administration workspace.',
    icon: ShieldCheck,
  },
}

export default function DashboardEntryPage() {
  const { profile, role, signOut } = useAuth()

  if (!profile || !role) {
    return null
  }

  const details = roleDetails[role]
  const Icon = details.icon

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-3xl">
        <Card padding="lg" className="shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <Icon size={28} />
            </div>

            <div>
              <p className="text-sm font-semibold text-emerald-700">
                Authenticated workspace
              </p>

              <h1 className="text-2xl font-extrabold text-brand-navy">
                {details.title}
              </h1>
            </div>
          </div>

          <p className="mt-6 text-slate-600">
            Welcome, {profile.full_name || 'NexRoad member'}.
          </p>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {details.description}
          </p>

          <div className="mt-6 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Account role
            </p>

            <p className="mt-1 font-bold capitalize text-brand-navy">
              {role}
            </p>
          </div>

          <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">
            Dashboard features are scheduled for the upcoming NexRoad
            development phases. This page currently verifies your account
            and role-based access.
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/"
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-brand-navy hover:bg-slate-50"
            >
              Back to homepage
            </Link>

            <button
              type="button"
              onClick={() => void signOut()}
              className="rounded-xl bg-brand-navy px-5 py-3 text-sm font-bold text-white hover:bg-slate-700"
            >
              Sign out
            </button>
          </div>
        </Card>
      </div>
    </main>
  )
}
