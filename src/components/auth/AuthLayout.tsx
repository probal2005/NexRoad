import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ShieldCheck } from 'lucide-react'

import PublicNavbar from '../layout/PublicNavbar'
import PublicFooter from '../layout/PublicFooter'

interface AuthLayoutProps {
  title: string
  description: string
  footerText: string
  footerLinkText: string
  footerTo: string
  children: ReactNode
}

export default function AuthLayout({
  title,
  description,
  footerText,
  footerLinkText,
  footerTo,
  children,
}: AuthLayoutProps) {
  return (
    <>
      <PublicNavbar />

      <main className="relative flex min-h-[calc(100vh-76px)] items-center justify-center overflow-hidden bg-slate-50 px-4 py-12 sm:py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-emerald-200/40 blur-3xl"
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-blue-200/30 blur-3xl"
        />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-extrabold tracking-tight text-brand-navy">
              {title}
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              {description}
            </p>
          </div>

          {children}

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-500">
            <ShieldCheck size={15} className="text-emerald-600" />
            Your account authentication is handled securely by Supabase.
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-brand-navy"
            >
              <ArrowLeft size={15} />
              Back to homepage
            </Link>
          </div>

          <p className="mt-6 text-center text-sm text-slate-500">
            {footerText}{' '}
            <Link
              to={footerTo}
              className="font-bold text-emerald-700 hover:text-emerald-800"
            >
              {footerLinkText}
            </Link>
          </p>
        </div>
      </main>

      <PublicFooter />
    </>
  )
}
