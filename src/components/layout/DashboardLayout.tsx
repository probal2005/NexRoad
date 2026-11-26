import type { ReactNode } from 'react'
import { ChevronRight, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'

import BrandLogo from '../common/BrandLogo'
import Button from '../ui/Button'

type DashboardLayoutProps = {
  title: string
  description?: string
  status?: ReactNode
  actions?: ReactNode
  coverImage?: string
  sections?: ReadonlyArray<readonly [id: string, label: string]>
  secondaryLink?: { to: string; label: string }
  onSignOut: () => void
  children: ReactNode
}

const navigationStyle = 'flex min-h-10 items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-emerald-50 hover:text-emerald-900 focus-visible:outline-2 focus-visible:outline-emerald-700'

export default function DashboardLayout({
  title, description, status, actions, coverImage, sections, secondaryLink, onSignOut, children,
}: DashboardLayoutProps) {
  const hasNavigation = Boolean(sections?.length || secondaryLink)

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#dashboard-content" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:rounded-md focus:bg-white focus:p-3">
        Skip to dashboard content
      </a>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[90rem] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
          <BrandLogo size="sm" showTagline={false} />
          <Button size="sm" variant="outline" leftIcon={<LogOut size={15} aria-hidden />} onClick={onSignOut}>Sign out</Button>
        </div>
      </header>
      <div className={`mx-auto grid items-start gap-5 px-4 py-5 sm:px-6 sm:py-7 lg:gap-7 lg:px-8 ${hasNavigation ? 'max-w-[90rem] lg:grid-cols-[14rem_minmax(0,1fr)]' : 'max-w-4xl'}`}>
        {hasNavigation && (
          <nav aria-label="Dashboard sections" className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:sticky lg:top-5 lg:max-h-[calc(100dvh-2.5rem)] lg:overflow-y-auto lg:p-3">
            <ul className="flex flex-wrap gap-1 lg:flex-col">
              {sections?.map(([id, label]) => (
                <li key={id}><a className={navigationStyle} href={`#${id}`}>{label}<ChevronRight className="hidden lg:block" size={15} aria-hidden /></a></li>
              ))}
              {secondaryLink && (
                <li><Link className={navigationStyle} to={secondaryLink.to}>{secondaryLink.label}<ChevronRight className="hidden lg:block" size={15} aria-hidden /></Link></li>
              )}
            </ul>
          </nav>
        )}
        <main id="dashboard-content" tabIndex={-1} className="min-w-0 space-y-5 outline-none sm:space-y-6">
          <div className={coverImage
            ? 'relative isolate overflow-hidden rounded-3xl bg-brand-navy px-5 py-8 text-white shadow-lg sm:px-8 sm:py-10 lg:px-10'
            : 'flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white p-5 shadow-sm sm:p-7'}>
            {coverImage && (
              <>
                <img src={coverImage} alt="" fetchPriority="high" className="absolute inset-y-0 right-0 -z-20 h-full w-full object-cover object-right sm:w-4/5" />
                <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-r from-[#101c2c] from-18% via-[#101c2c]/95 via-54% to-[#101c2c]/45 sm:via-47%" />
              </>
            )}
            <div className="min-w-0">
              <h1 className={`break-words font-extrabold tracking-tight ${coverImage ? 'text-3xl sm:text-4xl' : 'text-2xl text-brand-navy sm:text-3xl'}`}>{title}</h1>
              {description && <p className={`mt-2 max-w-sm text-sm leading-6 break-words ${coverImage ? 'text-slate-200' : 'text-slate-600'}`}>{description}</p>}
              {status && <div className={coverImage ? 'mt-4 inline-flex max-w-full rounded-lg bg-white px-3 py-1.5' : 'mt-2'}>{status}</div>}
            </div>
            {actions}
          </div>
          {children}
        </main>
      </div>
    </div>
  )
}
