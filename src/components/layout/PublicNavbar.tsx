import { useEffect, useState } from 'react'
import { ChevronUp, Menu, X } from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'

import BrandLogo from '../common/BrandLogo'

const navigationLinks = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `text-sm font-semibold transition-colors ${
    isActive
      ? 'text-emerald-600'
      : 'text-slate-600 hover:text-emerald-600'
  }`

export default function PublicNavbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showBackToTop, setShowBackToTop] = useState(false)

  const closeMobileMenu = () => setMobileMenuOpen(false)

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 320)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [])

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }

  return (
    <>
      <header className="fixed top-0 right-0 left-0 z-50 border-b border-slate-200/80 bg-white/95 shadow-sm backdrop-blur-xl">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex min-h-[76px] max-w-7xl items-center justify-between gap-4 px-5 sm:px-6 lg:px-8"
        >
          <Link to="/" onClick={closeMobileMenu} className="shrink-0">
            <BrandLogo size="md" />
          </Link>

          <div className="hidden items-center gap-6 lg:flex">
            {navigationLinks.map((link) => (
              <NavLink
                key={link.href}
                to={link.href}
                end={link.href === '/'}
                className={linkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              to="/login"
              className="rounded-xl px-4 py-2.5 text-sm font-bold text-brand-navy transition-colors hover:bg-slate-100"
            >
              Log in
            </Link>

            <Link
              to="/register"
              className="rounded-xl bg-brand-green px-5 py-2.5 text-sm font-bold text-brand-navy shadow-sm transition-all hover:-translate-y-0.5 hover:bg-emerald-300"
            >
              Get Started
            </Link>
          </div>

          <button
            type="button"
            aria-label={
              mobileMenuOpen
                ? 'Close navigation menu'
                : 'Open navigation menu'
            }
            aria-expanded={mobileMenuOpen}
            aria-controls="mobile-navigation"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-brand-navy transition-colors hover:bg-slate-100 lg:hidden"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>

        {mobileMenuOpen && (
          <div
            id="mobile-navigation"
            className="border-t border-slate-200 bg-white px-5 py-5 shadow-xl lg:hidden"
          >
            <div className="mx-auto flex max-w-7xl flex-col gap-2">
              {navigationLinks.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  end={link.href === '/'}
                  onClick={closeMobileMenu}
                  className={({ isActive }) =>
                    `rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                    }`
                  }
                >
                  {link.label}
                </NavLink>
              ))}

              <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
                <Link
                  to="/login"
                  onClick={closeMobileMenu}
                  className="rounded-xl border border-slate-200 px-4 py-3 text-center text-sm font-bold text-brand-navy"
                >
                  Log in
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="rounded-xl bg-brand-green px-4 py-3 text-center text-sm font-bold text-brand-navy"
                >
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <div aria-hidden="true" className="h-[76px]" />

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          title="Back to top"
          className="fixed right-5 bottom-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-brand-navy text-white shadow-xl shadow-slate-900/20 transition-all duration-200 hover:-translate-y-1 hover:bg-emerald-500 hover:text-brand-navy focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-500 sm:right-8 sm:bottom-8"
        >
          <ChevronUp size={24} strokeWidth={2.5} />
        </button>
      )}
    </>
  )
}
