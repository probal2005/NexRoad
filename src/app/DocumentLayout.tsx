import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'

import AuthLoadingScreen from '../components/auth/AuthLoadingScreen'

const base = 'https://nexroad.vercel.app'
const pages: Record<string, { title: string; description: string }> = {
  '/': { title: 'Roadside Assistance in Chandigarh', description: 'Explore NexRoad’s roadside assistance simulation for fuel delivery, mechanical help and towing in Chandigarh.' },
  '/about': { title: 'About', description: 'Learn how NexRoad simulates roadside assistance for drivers and technicians in Chandigarh.' },
  '/services': { title: 'Services', description: 'Explore simulated fuel delivery, mechanical assistance and towing with NexRoad.' },
  '/how-it-works': { title: 'How It Works', description: 'See how a NexRoad request goes from pickup and matching to service completion.' },
  '/contact': { title: 'Contact', description: 'Find contact information and the NexRoad demonstration contact form.' },
}

export default function DocumentLayout() {
  const { pathname } = useLocation()
  const path = pathname.replace(/\/+$/, '') || '/'
  const page = Object.hasOwn(pages, path) ? pages[path] : undefined
  const title = page ? `${page.title} | NexRoad` : 'NexRoad'

  useEffect(() => {
    const description = document.querySelector('meta[name="description"]')
    const robots = document.querySelector('meta[name="robots"]')
    const canonical = document.querySelector('link[rel="canonical"]')
    document.title = title
    description?.setAttribute('content', page?.description ?? pages['/'].description)
    robots?.setAttribute('content', page ? 'index,follow' : 'noindex,follow')
    if (page) canonical?.setAttribute('href', new URL(path, base).href)
    else canonical?.removeAttribute('href')
  }, [page, path, title])

  return <Suspense fallback={<AuthLoadingScreen message="Loading page…" />}><Outlet /></Suspense>
}
