import {
  ArrowRight,
  Clock3,
  Fuel,
  MapPin,
  ShieldCheck,
  Truck,
  Wrench,
} from 'lucide-react'

import BrandWatermark from '../components/common/BrandWatermark'
import PublicNavbar from '../components/layout/PublicNavbar'
import PublicFooter from '../components/layout/PublicFooter'

const services = [
  {
    title: 'Fuel Assistance',
    description:
      'Explore roadside fuel assistance when your vehicle runs out of fuel during a journey.',
    icon: Fuel,
    label: 'Fuel assistance simulation',
  },
  {
    title: 'Mechanical Support',
    description:
      'Explore nearby technician assistance for common roadside vehicle problems.',
    icon: Wrench,
    label: 'Roadside repair simulation',
  },
  {
    title: 'Towing Service',
    description:
      'Explore towing assistance for vehicles that cannot safely continue their journey.',
    icon: Truck,
    label: 'Vehicle towing simulation',
  },
]

function App() {
  return (
    <BrandWatermark className="min-h-screen bg-brand-light">
      <PublicNavbar />

      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
          <div>
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              ROADSIDE ASSISTANCE PLATFORM
            </div>

            <h1 className="max-w-2xl text-5xl leading-[1.08] font-extrabold tracking-tight text-brand-navy sm:text-6xl lg:text-7xl">
              Help is closer than you{' '}
              <span className="text-emerald-500">think.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600">
              Roadside assistance made simpler. Explore fuel assistance,
              mechanical support and towing services through one connected
              platform.
            </p>

            <div className="mt-9 flex flex-wrap gap-4">
              <a
                href="/services"
                className="inline-flex items-center gap-3 rounded-xl bg-brand-green px-7 py-4 font-bold text-brand-navy shadow-lg shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-300"
              >
                Explore NexRoad
                <ArrowRight size={18} />
              </a>

              <a
                href="#how-it-works"
                className="rounded-xl border border-slate-300 bg-white px-7 py-4 font-semibold text-brand-navy transition hover:border-slate-400 hover:bg-slate-50"
              >
                How it works
              </a>
            </div>

            <div className="mt-12 grid max-w-lg grid-cols-3 gap-5 border-t border-slate-200 pt-7">
              <div>
                <ShieldCheck className="mb-2 text-emerald-600" size={22} />
                <p className="text-sm font-bold text-brand-navy">
                  Connected
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Service network
                </p>
              </div>

              <div>
                <Clock3 className="mb-2 text-emerald-600" size={22} />
                <p className="text-sm font-bold text-brand-navy">
                  Convenient
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Simple workflow
                </p>
              </div>

              <div>
                <MapPin className="mb-2 text-emerald-600" size={22} />
                <p className="text-sm font-bold text-brand-navy">
                  Location-based
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Nearby assistance
                </p>
              </div>
            </div>
          </div>

          {/* Service network preview */}
          <div className="relative">
            <div className="absolute -inset-5 rounded-[2rem] bg-emerald-200/40 blur-3xl" />

            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-7 shadow-2xl shadow-slate-900/10 sm:p-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">
                    NEXROAD SERVICE NETWORK
                  </p>
                  <h2 className="mt-2 text-2xl font-extrabold text-brand-navy">
                    Assistance, connected.
                  </h2>
                </div>

                <img
                  src="/logo/nexroad-mark.svg"
                  alt="NexRoad"
                  className="h-14 w-14"
                />
              </div>

              <div className="my-8 rounded-2xl bg-brand-navy p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">
                      Simulation environment
                    </p>
                    <p className="mt-1 text-xl font-bold">
                      Chandigarh, India
                    </p>
                  </div>
                  <MapPin className="text-brand-green" size={30} />
                </div>

                <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-brand-green" />
                </div>

                <p className="mt-3 text-xs text-slate-400">
                  Interactive demonstration environment
                </p>
              </div>

              <div className="space-y-3">
                {services.map((service) => {
                  const Icon = service.icon

                  return (
                    <div
                      key={service.title}
                      className="flex items-center gap-4 rounded-xl border border-slate-100 bg-slate-50 p-4"
                    >
                      <div className="rounded-xl bg-emerald-100 p-3 text-emerald-700">
                        <Icon size={23} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-brand-navy">
                          {service.title}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {service.label}
                        </p>
                      </div>

                      <ArrowRight
                        size={18}
                        className="shrink-0 text-slate-400"
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Services */}
        <section
          id="services"
          className="scroll-mt-24 border-t border-slate-200 bg-white py-20"
        >
          <div className="mx-auto max-w-7xl px-6 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-sm font-bold tracking-widest text-emerald-600">
                OUR SERVICES
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                One platform. Three essential services.
              </h2>

              <p className="mt-4 leading-7 text-slate-600">
                Explore the core roadside assistance services available in
                the NexRoad demonstration platform.
              </p>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {services.map((service) => {
                const Icon = service.icon

                return (
                  <article
                    key={service.title}
                    className="rounded-2xl border border-slate-200 bg-brand-light p-7 transition hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
                  >
                    <div className="inline-flex rounded-2xl bg-emerald-100 p-4 text-emerald-700">
                      <Icon size={28} />
                    </div>

                    <h3 className="mt-6 text-xl font-bold text-brand-navy">
                      {service.title}
                    </h3>

                    <p className="mt-3 leading-7 text-slate-600">
                      {service.description}
                    </p>

                    <a
                      href="/services"
                      className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-700 transition hover:text-emerald-900"
                    >
                      Explore service
                      <ArrowRight size={16} />
                    </a>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section
          id="how-it-works"
          className="scroll-mt-24 mx-auto max-w-7xl px-6 py-20 lg:px-8"
        >
          <div className="rounded-3xl bg-brand-navy px-7 py-12 text-white sm:px-12">
            <p className="text-sm font-bold tracking-widest text-brand-green">
              SIMPLE BY DESIGN
            </p>

            <h2 className="mt-3 text-3xl font-extrabold sm:text-4xl">
              Drive Safe. Get Help. Go Further.
            </h2>

            <p className="mt-4 max-w-2xl leading-7 text-slate-300">
              NexRoad demonstrates how drivers, service technicians and
              administrators can work together through a single roadside
              assistance platform.
            </p>

            <a
              href="/how-it-works"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-brand-green px-6 py-3 font-bold text-brand-navy transition hover:bg-emerald-300"
            >
              Get started
              <ArrowRight size={17} />
            </a>
          </div>
        </section>

        {/* About */}
        <section
          id="about"
          className="scroll-mt-24 border-t border-slate-200 bg-white py-20"
        >
          <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-2 lg:items-center lg:px-8">
            <div>
              <p className="text-sm font-bold tracking-widest text-emerald-600">
                ABOUT NEXROAD
              </p>

              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl">
                A connected approach to roadside assistance.
              </h2>
            </div>

            <div>
              <p className="leading-8 text-slate-600">
                NexRoad is a demonstration platform designed to bring drivers
                and roadside service technicians together. It explores how
                location-based service requests, technician matching and
                service workflows can work within one digital experience.
              </p>

              <p className="mt-4 text-sm leading-7 text-slate-500">
                The current demonstration environment is based in Chandigarh,
                India. Service requests, technician activity and payments
                are simulated and do not represent real-world dispatch or
                transactions.
              </p>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </BrandWatermark>
  )
}

export default App
