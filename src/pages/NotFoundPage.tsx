import { ArrowLeft, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import BrandWatermark from '../components/common/BrandWatermark'
import PublicFooter from '../components/layout/PublicFooter'
import PublicNavbar from '../components/layout/PublicNavbar'

export default function NotFoundPage() {
  return (
    <BrandWatermark className="flex min-h-screen flex-col bg-brand-light">
      <PublicNavbar />

      <main className="relative z-10 flex flex-1 items-center justify-center px-6 py-24">
        <div className="max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600">
            <MapPin size={38} />
          </div>

          <p className="mt-8 text-sm font-bold tracking-[0.2em] text-emerald-600">
            ERROR 404
          </p>

          <h1 className="mt-4 text-5xl font-extrabold tracking-tight text-brand-navy sm:text-6xl">
            Wrong turn?
          </h1>

          <p className="mt-5 text-lg leading-8 text-slate-600">
            We couldn't find the page you were looking for. Let's get you back
            on the right road.
          </p>

          <Link
            to="/"
            className="mt-9 inline-flex items-center gap-3 rounded-xl bg-brand-green px-6 py-4 font-bold text-brand-navy transition hover:-translate-y-0.5 hover:bg-emerald-300"
          >
            <ArrowLeft size={18} />
            Return to homepage
          </Link>
        </div>
      </main>

      <PublicFooter />
    </BrandWatermark>
  )
}
