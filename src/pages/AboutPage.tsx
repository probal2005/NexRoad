import {
  ArrowRight,
  CheckCircle2,
  Compass,
  Fuel,
  MapPin,
  ShieldCheck,
  Target,
  Truck,
  Users,
  Wrench,
  Workflow,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'

import BrandWatermark from '../components/common/BrandWatermark'
import PublicFooter from '../components/layout/PublicFooter'
import PublicNavbar from '../components/layout/PublicNavbar'

const objectives = [
  {
    icon: Workflow,
    title: 'Simplify assistance',
    description:
      'Present common roadside assistance categories through one organised digital experience.',
  },
  {
    icon: MapPin,
    title: 'Explore location awareness',
    description:
      'Demonstrate how location information can help connect a request with eligible nearby service providers.',
  },
  {
    icon: Users,
    title: 'Connect platform roles',
    description:
      'Model how drivers, technicians and administrators can interact within a shared platform.',
  },
  {
    icon: ShieldCheck,
    title: 'Promote transparency',
    description:
      'Make request progress, service information and estimated pricing easier to understand.',
  },
]

const services = [
  {
    icon: Fuel,
    title: 'Fuel assistance',
    description:
      'A workflow concept for drivers who need fuel while travelling.',
    color: 'bg-amber-50 text-amber-600',
  },
  {
    icon: Wrench,
    title: 'Mechanical support',
    description:
      'A workflow concept for common vehicle problems and roadside repair decisions.',
    color: 'bg-blue-50 text-blue-600',
  },
  {
    icon: Truck,
    title: 'Vehicle towing',
    description:
      'A workflow concept for vehicles that cannot safely continue their journey.',
    color: 'bg-emerald-50 text-emerald-600',
  },
]

const principles = [
  'A clear experience for drivers seeking assistance.',
  'A structured workspace for technicians and service requests.',
  'Administrative oversight of platform activity.',
  'Transparent demonstration of request and pricing workflows.',
]

export default function AboutPage() {
  return (
    <BrandWatermark className="min-h-screen bg-brand-light">
      <PublicNavbar />

      <main className="relative z-10">
        {/* Hero */}
        <section className="overflow-hidden border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-28">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold tracking-wide text-emerald-800">
                <Compass size={15} />
                ABOUT NEXROAD
              </div>

              <h1 className="mt-7 max-w-3xl text-4xl leading-[1.1] font-extrabold tracking-tight text-brand-navy sm:text-5xl lg:text-6xl">
                A clearer way to explore{' '}
                <span className="text-emerald-500">
                  roadside assistance.
                </span>
              </h1>

              <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-600">
                NexRoad is a location-aware roadside assistance demonstration
                platform. It brings drivers, technicians and administrators
                into one connected digital experience to explore how roadside
                service requests can be organised and managed.
              </p>

              <div className="mt-9 flex flex-wrap gap-4">
                <Link
                  to="/services"
                  className="inline-flex items-center gap-3 rounded-xl bg-brand-green px-6 py-4 font-bold text-brand-navy shadow-lg shadow-emerald-500/15 transition hover:-translate-y-0.5 hover:bg-emerald-300"
                >
                  Explore services
                  <ArrowRight size={18} />
                </Link>

                <Link
                  to="/how-it-works"
                  className="inline-flex items-center rounded-xl border border-slate-300 bg-white px-6 py-4 font-semibold text-brand-navy transition hover:border-slate-400 hover:bg-slate-50"
                >
                  How it works
                </Link>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-5 rounded-[2rem] bg-emerald-100/70 blur-2xl" />

              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-brand-navy p-7 text-white shadow-2xl shadow-slate-900/10 sm:p-9">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold tracking-[0.2em] text-emerald-300">
                      NEXROAD PLATFORM
                    </p>
                    <h2 className="mt-2 text-2xl font-bold">
                      One connected experience
                    </h2>
                  </div>
                  <div className="rounded-2xl bg-white/10 p-3 text-emerald-300">
                    <MapPin size={27} />
                  </div>
                </div>

                <div className="my-9 flex flex-col items-center">
                  <div className="flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/10 p-5">
                    <Users className="text-emerald-300" size={25} />
                    <div>
                      <p className="font-bold">Driver</p>
                      <p className="text-xs text-slate-300">
                        Creates a service request
                      </p>
                    </div>
                  </div>

                  <div className="h-8 w-px bg-emerald-400/60" />

                  <div className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2 text-xs font-bold tracking-wide text-emerald-300">
                    NEXROAD PLATFORM
                  </div>

                  <div className="h-8 w-px bg-emerald-400/60" />

                  <div className="grid w-full grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <Wrench className="mb-3 text-emerald-300" size={22} />
                      <p className="font-bold">Technician</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">
                        Handles eligible requests
                      </p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                      <ShieldCheck
                        className="mb-3 text-emerald-300"
                        size={22}
                      />
                      <p className="font-bold">Admin</p>
                      <p className="mt-1 text-xs leading-5 text-slate-300">
                        Oversees platform activity
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-white/10 pt-5 text-xs text-slate-300">
                  <span>Demonstration architecture</span>
                  <span className="font-semibold text-emerald-300">
                    Chandigarh, India
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Overview */}
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-20">
            <div>
              <p className="text-sm font-bold tracking-[0.2em] text-emerald-600">
                OUR OVERVIEW
              </p>
              <h2 className="mt-4 text-3xl leading-tight font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                Bringing roadside service workflows into one platform.
              </h2>
            </div>

            <div className="space-y-5 text-base leading-8 text-slate-600">
              <p>
                When a vehicle faces a problem on the road, finding the right
                kind of assistance can be confusing. Fuel shortages, mechanical
                issues and vehicle breakdowns each require a different
                response.
              </p>
              <p>
                NexRoad explores a structured digital approach to these
                situations. The platform models service categories, location
                awareness, technician availability, request handling and
                service progress within a unified interface.
              </p>
              <p>
                The current project is a realistic interactive simulation. Its
                purpose is to demonstrate the platform's workflows and
                technical architecture, not to operate as a live roadside
                assistance company.
              </p>
            </div>
          </div>
        </section>

        {/* Vision and mission */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl gap-6 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
            <article className="rounded-3xl bg-brand-navy p-8 text-white sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300">
                <Compass size={25} />
              </div>

              <p className="mt-7 text-xs font-bold tracking-[0.2em] text-emerald-300">
                OUR VISION
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight">
                Make roadside assistance easier to navigate.
              </h2>

              <p className="mt-5 leading-8 text-slate-300">
                We envision a connected digital environment where drivers can
                understand their assistance options and service providers can
                manage requests through a clear and organised process.
              </p>
            </article>

            <article className="rounded-3xl border border-slate-200 bg-brand-light p-8 sm:p-10">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <Target size={25} />
              </div>

              <p className="mt-7 text-xs font-bold tracking-[0.2em] text-emerald-700">
                OUR MISSION
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy">
                Demonstrate a structured service ecosystem.
              </h2>

              <p className="mt-5 leading-8 text-slate-600">
                Our mission is to build an interactive platform prototype that
                demonstrates service discovery, role-based experiences,
                request coordination and transparent workflow management.
              </p>
            </article>
          </div>
        </section>

        {/* Objectives */}
        <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold tracking-[0.2em] text-emerald-600">
              WHAT WE FOCUS ON
            </p>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              Built around four core objectives.
            </h2>
            <p className="mt-5 leading-7 text-slate-600">
              These principles guide the design and development of the NexRoad
              demonstration platform.
            </p>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {objectives.map((objective, index) => {
              const Icon = objective.icon

              return (
                <article
                  key={objective.title}
                  className="rounded-2xl border border-slate-200 bg-white p-6 transition duration-300 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-xl hover:shadow-slate-900/5"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Icon size={23} />
                  </div>

                  <p className="mt-6 text-xs font-bold tracking-widest text-emerald-600">
                    0{index + 1}
                  </p>

                  <h3 className="mt-2 text-lg font-bold text-brand-navy">
                    {objective.title}
                  </h3>

                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {objective.description}
                  </p>
                </article>
              )
            })}
          </div>
        </section>

        {/* Service categories */}
        <section className="border-y border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 py-20 lg:px-8 lg:py-24">
            <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
              <div className="max-w-2xl">
                <p className="text-sm font-bold tracking-[0.2em] text-emerald-600">
                  PLATFORM CATEGORIES
                </p>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                  Three assistance categories. One experience.
                </h2>
                <p className="mt-5 leading-7 text-slate-600">
                  NexRoad organises its demonstration workflows around three
                  common roadside assistance needs.
                </p>
              </div>

              <Link
                to="/services"
                className="inline-flex shrink-0 items-center gap-2 font-bold text-emerald-700 transition hover:text-emerald-900"
              >
                View all services
                <ArrowRight size={18} />
              </Link>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon

                return (
                  <article
                    key={service.title}
                    className="rounded-2xl border border-slate-200 bg-brand-light p-7"
                  >
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl ${service.color}`}
                    >
                      <Icon size={27} />
                    </div>

                    <h3 className="mt-6 text-xl font-bold text-brand-navy">
                      {service.title}
                    </h3>

                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {service.description}
                    </p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* Platform principles */}
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-24">
          <div>
            <p className="text-sm font-bold tracking-[0.2em] text-emerald-600">
              OUR APPROACH
            </p>

            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              Designed for clarity, coordination and transparency.
            </h2>

            <p className="mt-5 leading-8 text-slate-600">
              The platform is organised around distinct user roles and
              structured service workflows. Each part has a defined purpose,
              helping demonstrate how the overall system can operate.
            </p>
          </div>

          <div className="space-y-4">
            {principles.map((principle) => (
              <div
                key={principle}
                className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5"
              >
                <CheckCircle2
                  className="mt-0.5 shrink-0 text-emerald-600"
                  size={21}
                />
                <p className="font-medium leading-7 text-slate-700">
                  {principle}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Location and scope */}
        <section className="border-y border-slate-200 bg-brand-navy text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[1fr_auto] lg:items-center lg:px-8 lg:py-20">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-emerald-300">
                <MapPin size={14} />
                INITIAL DEMONSTRATION CITY
              </div>

              <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Starting with Chandigarh, India.
              </h2>

              <p className="mt-5 max-w-2xl leading-8 text-slate-300">
                Chandigarh is the initial reference environment for the NexRoad
                prototype. The system is being structured with the possibility
                of supporting additional cities in a future implementation.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-400">
                Location displays and technician activity in the demonstration
                may use simulated data. They must not be interpreted as live
                service availability.
              </p>
            </div>

            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="rounded-xl bg-emerald-400/15 p-3 text-emerald-300">
                <Zap size={27} />
              </div>
              <div>
                <p className="text-sm font-bold">Future-ready structure</p>
                <p className="mt-1 text-xs text-slate-400">
                  Designed with expansion in mind
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Demo notice */}
        <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
          <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 sm:p-9">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                <ShieldCheck size={24} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-amber-950">
                  Important: Demonstration platform
                </h2>

                <p className="mt-3 text-sm leading-7 text-amber-900/80">
                  NexRoad is currently a website prototype and interactive
                  simulation. It does not provide actual roadside assistance,
                  dispatch real technicians, deliver fuel, arrange physical
                  towing or process real payments. Demonstration bookings,
                  technician activity, tracking and payment flows are
                  simulated.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-6 pb-20 lg:px-8 lg:pb-24">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-emerald-400 px-7 py-12 text-center sm:px-12 sm:py-16">
            <p className="text-xs font-extrabold tracking-[0.2em] text-brand-navy/70">
              EXPLORE THE PLATFORM
            </p>

            <h2 className="mx-auto mt-4 max-w-2xl text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
              Discover how the NexRoad experience is organised.
            </h2>

            <p className="mx-auto mt-5 max-w-xl leading-7 text-brand-navy/75">
              Explore the service categories and the workflows behind the
              demonstration platform.
            </p>

            <Link
              to="/services"
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-brand-navy px-7 py-4 font-bold text-white transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              Explore services
              <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </BrandWatermark>
  )
}
