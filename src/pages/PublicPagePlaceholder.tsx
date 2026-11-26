import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import BrandWatermark from '../components/common/BrandWatermark'
import PublicFooter from '../components/layout/PublicFooter'
import PublicNavbar from '../components/layout/PublicNavbar'

interface PublicPagePlaceholderProps {
  title: string
  description: string
}

export default function PublicPagePlaceholder({
  title,
  description,
}: PublicPagePlaceholderProps) {
  return (
    <BrandWatermark className="flex min-h-screen flex-col bg-brand-light">
      <PublicNavbar />

      <main className="relative z-10 flex flex-1 items-center">
        <section className="mx-auto w-full max-w-7xl px-6 py-24 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-bold tracking-[0.2em] text-emerald-600">
              NEXROAD · CHANDIGARH
            </p>

            <h1 className="mt-5 text-4xl leading-tight font-extrabold tracking-tight text-brand-navy sm:text-6xl">
              {title}
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              {description}
            </p>

            <p className="mt-5 text-sm leading-7 text-slate-500">
              This page is currently under development as part of the NexRoad
              demonstration website.
            </p>

            <Link
              to="/"
              className="mt-9 inline-flex items-center gap-3 rounded-xl bg-brand-green px-6 py-4 font-bold text-brand-navy transition hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              Back to home
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </BrandWatermark>
  )
}
