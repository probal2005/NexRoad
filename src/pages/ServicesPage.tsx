import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Fuel,
  MapPin,
  ShieldCheck,
  Truck,
  Wrench,
  Zap,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/layout/PublicFooter'
import PublicNavbar from '../components/layout/PublicNavbar'

const services = [
  {
    number: '01',
    title: 'Fuel Assistance',
    subtitle: 'Running low? Find fuel assistance.',
    description:
      'The fuel assistance workflow helps a user request fuel when their vehicle runs low. In the NexRoad simulation, an eligible fuel provider can fulfil the request using their own stock or by sourcing fuel from a nearby petrol pump.',
    icon: Fuel,
    color: 'emerald',
    features: [
      'Request fuel for your vehicle',
      'Choose or enter the required fuel quantity',
      'Provider can use personal stock or a nearby petrol pump',
      'View an estimated price before confirming',
    ],
    steps: ['Submit a fuel request', 'Nearby providers receive the request', 'A provider accepts and completes the simulated service'],
  },
  {
    number: '02',
    title: 'Mechanical Support',
    subtitle: 'Vehicle trouble? Get roadside assistance.',
    description:
      'Mechanical support covers common vehicle breakdown situations. A user can describe the problem and request an eligible mechanical technician. The simulated technician workflow supports three possible outcomes based on the problem.',
    icon: Wrench,
    color: 'blue',
    features: [
      'Describe the vehicle problem',
      'Request a mechanical technician',
      'Roadside repair when the issue can be resolved on-site',
      'Garage referral or towing when roadside repair is not suitable',
    ],
    steps: ['Describe the issue', 'A technician accepts the request', 'The technician records the service outcome'],
  },
  {
    number: '03',
    title: 'Towing Service',
    subtitle: 'Unable to continue? Arrange a towing request.',
    description:
      'The towing workflow is designed for vehicles that cannot safely continue their journey. Users can provide their pickup location and vehicle details, then request an eligible towing provider through the simulation.',
    icon: Truck,
    color: 'amber',
    features: [
      'Submit a towing request',
      'Provide pickup and destination details',
      'Receive an estimated service quote',
      'Follow the simulated request status',
    ],
    steps: ['Enter pickup and destination', 'A towing provider receives the request', 'Track the simulated towing workflow'],
  },
]

const colorStyles = {
  emerald: {
    icon: 'bg-emerald-100 text-emerald-700',
    number: 'text-emerald-600',
    accent: 'bg-emerald-500',
    tag: 'bg-emerald-50 text-emerald-700',
  },
  blue: {
    icon: 'bg-blue-100 text-blue-700',
    number: 'text-blue-600',
    accent: 'bg-blue-500',
    tag: 'bg-blue-50 text-blue-700',
  },
  amber: {
    icon: 'bg-amber-100 text-amber-700',
    number: 'text-amber-600',
    accent: 'bg-amber-500',
    tag: 'bg-amber-50 text-amber-700',
  },
}

function ServicesPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#F4F7FA] text-[#101C2C]">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden bg-[#101C2C] px-5 py-20 text-white sm:py-24">
          <div className="pointer-events-none absolute -right-28 -top-28 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-12 -top-12 h-64 w-64 rounded-full border border-white/10" />

          <div className="relative mx-auto max-w-7xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#55E6A5]/30 bg-[#55E6A5]/10 px-4 py-2 text-sm font-semibold text-[#55E6A5]">
              <Zap size={15} />
              NexRoad Services
            </div>

            <div className="max-w-3xl">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Help for the road.
                <span className="block text-[#55E6A5]">When you need it.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Explore fuel assistance, mechanical support and towing workflows
                designed to make roadside assistance easier to understand and
                access.
              </p>

              <div className="mt-9 flex flex-wrap gap-3">
                <a
                  href="#service-list"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#55E6A5] px-6 py-3.5 font-bold text-[#101C2C] transition hover:bg-[#42d995]"
                >
                  Explore services <ArrowRight size={18} />
                </a>
                <Link
                  to="/how-it-works"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/20 px-6 py-3.5 font-semibold text-white transition hover:bg-white/10"
                >
                  How it works
                </Link>
              </div>
            </div>

            <div className="mt-14 grid max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { icon: Fuel, label: 'Fuel assistance' },
                { icon: Wrench, label: 'Mechanical support' },
                { icon: Truck, label: 'Towing service' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
                >
                  <item.icon className="text-[#55E6A5]" size={21} />
                  <span className="text-sm font-semibold text-slate-100">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="service-list" className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                What we cover
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Three services. One platform.
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Choose the type of roadside assistance that matches your
                situation. Each service follows its own request and completion
                workflow.
              </p>
            </div>

            <div className="space-y-8">
              {services.map((service) => {
                const styles = colorStyles[service.color as keyof typeof colorStyles]
                const Icon = service.icon

                return (
                  <article
                    key={service.number}
                    className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
                      <div className="relative p-7 sm:p-10">
                        <div className="absolute right-7 top-7 text-5xl font-black text-slate-100 sm:text-6xl">
                          {service.number}
                        </div>

                        <div className={`relative flex h-14 w-14 items-center justify-center rounded-2xl ${styles.icon}`}>
                          <Icon size={27} />
                        </div>

                        <p className={`mt-8 text-xs font-bold uppercase tracking-[0.2em] ${styles.number}`}>
                          Roadside service
                        </p>
                        <h3 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                          {service.title}
                        </h3>
                        <p className="mt-2 font-semibold text-slate-500">
                          {service.subtitle}
                        </p>
                        <p className="mt-5 max-w-xl text-sm leading-7 text-slate-600">
                          {service.description}
                        </p>

                        <Link
                          to="/register"
                          className="mt-8 inline-flex items-center gap-2 font-bold text-[#101C2C] transition hover:text-emerald-700"
                        >
                          Get started <ArrowRight size={17} />
                        </Link>
                      </div>

                      <div className="bg-slate-50 p-7 sm:p-10">
                        <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                          Service features
                        </h4>

                        <ul className="mt-5 space-y-4">
                          {service.features.map((feature) => (
                            <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <div className="mt-9 border-t border-slate-200 pt-7">
                          <h4 className="text-sm font-bold uppercase tracking-wider text-slate-500">
                            Typical workflow
                          </h4>
                          <div className="mt-5 grid gap-3 sm:grid-cols-3">
                            {service.steps.map((step, index) => (
                              <div key={step} className="rounded-xl border border-slate-200 bg-white p-4">
                                <span className={`text-xs font-extrabold ${styles.number}`}>
                                  STEP 0{index + 1}
                                </span>
                                <p className="mt-2 text-sm font-semibold leading-6 text-slate-700">
                                  {step}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className={`h-1.5 w-full ${styles.accent}`} />
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 rounded-3xl bg-[#101C2C] p-8 text-white sm:p-10 lg:grid-cols-[1fr_1fr] lg:items-center">
              <div>
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-[#55E6A5]">
                  Designed with clarity
                </span>
                <h2 className="mt-3 text-3xl font-extrabold">
                  Understand every step of the request.
                </h2>
                <p className="mt-4 max-w-xl leading-7 text-slate-300">
                  NexRoad demonstrates how service requests, provider
                  acceptance, estimated pricing and service status can work
                  together in one platform.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <MapPin className="text-[#55E6A5]" size={23} />
                  <h3 className="mt-4 font-bold">Location-aware concept</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Demonstrates location-based request matching in Chandigarh.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Clock3 className="text-[#55E6A5]" size={23} />
                  <h3 className="mt-4 font-bold">Request status</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Demonstrates request progress and service status updates.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <ShieldCheck className="text-[#55E6A5]" size={23} />
                  <h3 className="mt-4 font-bold">Controlled workflows</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Demonstrates provider eligibility and request handling.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                  <Zap className="text-[#55E6A5]" size={23} />
                  <h3 className="mt-4 font-bold">One platform</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    Brings three roadside assistance categories together.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto flex max-w-5xl flex-col items-center rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center sm:p-9">
            <ShieldCheck size={28} className="text-amber-700" />
            <h2 className="mt-4 text-xl font-extrabold text-[#101C2C]">
              Important: Demonstration platform
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
              NexRoad is currently a website prototype for demonstration and
              academic development. Fuel delivery, mechanical assistance,
              towing, provider dispatch, location tracking and payments are
              simulated. No real-world service provider is dispatched and no
              actual payment is processed.
            </p>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default ServicesPage
