import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { useAuth } from '../auth/useAuth'

export default function UnauthorizedPage() {
  const { user, role } = useAuth()

  const dashboardPath =
    role === 'admin'
      ? '/admin/dashboard'
      : role === 'technician'
        ? '/technician/dashboard'
        : '/dashboard'

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <ShieldAlert size={48} className="mx-auto text-amber-500" />

        <h1 className="mt-5 text-2xl font-extrabold text-brand-navy">
          Access restricted
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          Your account does not have the required role to access this page.
          Contact a NexRoad administrator if you believe this is a mistake.
        </p>

        <Link
          to={user ? dashboardPath : '/'}
          className="mt-7 inline-flex rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-brand-navy hover:bg-emerald-300"
        >
          {user ? 'Go to my dashboard' : 'Back to homepage'}
        </Link>
      </div>
    </main>
  )
}
