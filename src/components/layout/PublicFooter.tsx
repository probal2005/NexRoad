import { ArrowUpRight, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'

import BrandLogo from '../common/BrandLogo'
import Container from '../ui/Container'

const footerLinks = {
  Platform: [
    { label: 'Home', href: '/' },
    { label: 'Services', href: '/services' },
    { label: 'How it works', href: '/how-it-works' },
  ],
  Explore: [
    { label: 'Fuel assistance', href: '/services' },
    { label: 'Mechanical support', href: '/services' },
    { label: 'Towing service', href: '/services' },
  ],
  Information: [
    { label: 'About NexRoad', href: '/about' },
    { label: 'Contact', href: '/contact' },
  ],
}

export default function PublicFooter() {
  return (
    <footer className="bg-brand-navy text-white">
      <Container className="py-9 sm:py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5 lg:gap-7">
          <div className="lg:col-span-2">
            <BrandLogo dark size="lg" />

            <p className="mt-3 max-w-sm text-sm leading-6 text-slate-400">
              A connected roadside assistance platform designed to bring
              drivers and service technicians together.
            </p>

            <div className="mt-4 inline-flex items-center gap-2 text-sm text-slate-400">
              <MapPin size={17} className="text-brand-green" />
              Chandigarh, India
            </div>
          </div>

          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <h3 className="text-sm font-bold text-white">{heading}</h3>

              <ul className="mt-3 space-y-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      to={link.href}
                      className="inline-flex items-center gap-1 text-sm text-slate-400 transition-colors hover:text-brand-green"
                    >
                      {link.label}
                      <ArrowUpRight size={13} />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-col justify-between gap-3 border-t border-white/10 pt-5 text-xs text-slate-500 sm:flex-row">
          <p>© 2026 NexRoad. All rights reserved.</p>
          <p>Demonstration platform · Chandigarh, India</p>
        </div>
      </Container>
    </footer>
  )
}
