import {
  ArrowDown,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  MapPin,
  Radio,
  ShieldCheck,
  Truck,
  UserCheck,
  Users,
  Wallet,
  Wrench,
  Fuel,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/layout/PublicFooter'
import PublicNavbar from '../components/layout/PublicNavbar'

const stages = [
  {
    number: '01',
    title: 'Choose your assistance',
    description:
      'Select fuel assistance, mechanical support or towing. Provide your vehicle details and describe what help you need.',
    icon: ClipboardList,
    detail: 'A clear request helps the platform identify eligible service providers.',
  },
  {
    number: '02',
    title: 'Share your location',
    description:
      'Provide the breakdown or pickup location. The prototype can demonstrate location-based matching around Chandigarh.',
    icon: MapPin,
    detail: 'Location sharing is controlled by the user or technician where applicable.',
  },
  {
    number: '03',
    title: 'Nearby providers are notified',
    description:
      'The matching workflow identifies eligible technicians based on service type, availability and proximity, then broadcasts the request to multiple eligible providers.',
    icon: Radio,
    detail: 'Only technicians who offer the requested service are considered eligible.',
  },
  {
    number: '04',
    title: 'A provider accepts the request',
    description:
      'The first valid acceptance wins the request. Other pending offers are closed so that the same request is not assigned to multiple technicians.',
    icon: UserCheck,
    detail: 'The intended backend workflow uses an atomic acceptance operation.',
  },
  {
    number: '05',
    title: 'Review the estimated price',
    description:
      'The price estimate is based on the service or fuel cost, estimated travel distance and applicable service charge.',
    icon: CreditCard,
    detail: 'The quote is a simulation. No real payment is collected.',
  },
  {
    number: '06',
    title: 'Follow the service progress',
    description:
      'The user can follow the simulated request status while the technician updates the service workflow.',
    icon: Truck,
    detail: 'The prototype demonstrates progress updates, not a real dispatch operation.',
  },
  {
    number: '07',
    title: 'Complete the service',
    description:
      'The technician records the outcome and the request moves to its completed state. The user can review the service details.',
    icon: CheckCircle2,
    detail: 'Mechanical support can end in roadside repair, garage referral or a towing requirement.',
  },
]

const serviceFlows = [
  {
    title: 'Fuel assistance',
    icon: Fuel,
    color: 'text-emerald-700 bg-emerald-100',
    description:
      'The provider may use their own fuel stock or source fuel from a nearby petrol pump.',
    outcome: 'Fuel request completed in the simulation',
  },
  {
    title: 'Mechanical support',
    icon: Wrench,
    color: 'text-blue-700 bg-blue-100',
    description:
      'The technician assesses the reported problem and records the appropriate service outcome.',
    outcome: 'Roadside repair, garage required or towing required',
  },
  {
    title: 'Towing service',
    icon: Truck,
    color: 'text-amber-700 bg-amber-100',
    description:
      'The user supplies pickup and destination details for a simulated towing request.',
    outcome: 'Towing workflow marked complete in the simulation',
  },
]

function HowItWorksPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#F4F7FA] text-[#101C2C]">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden bg-[#101C2C] px-5 py-20 text-white sm:py-24">
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/10" />

          <div className="relative mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#55E6A5]/30 bg-[#55E6A5]/10 px-4 py-2 text-sm font-semibold text-[#55E6A5]">
              <Radio size={15} />
              The NexRoad process
            </span>

            <div className="mt-7 max-w-3xl">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                From a roadside problem
                <span className="block text-[#55E6A5]">to a clear next step.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Follow how a roadside assistance request moves through the
                NexRoad platform, from the initial request to provider
                acceptance and simulated service completion.
              </p>
              <a
                href="#process"
                className="mt-9 inline-flex items-center gap-2 rounded-xl bg-[#55E6A5] px-6 py-3.5 font-bold text-[#101C2C] transition hover:bg-[#42d995]"
              >
                Explore the process <ArrowDown size={18} />
              </a>
            </div>

            <div className="mt-14 grid max-w-3xl gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <ClipboardList className="text-[#55E6A5]" size={23} />
                <p className="mt-4 font-bold">Request</p>
                <p className="mt-1 text-sm text-slate-300">Tell us what you need</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <Users className="text-[#55E6A5]" size={23} />
                <p className="mt-4 font-bold">Match</p>
                <p className="mt-1 text-sm text-slate-300">Find eligible providers</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <ShieldCheck className="text-[#55E6A5]" size={23} />
                <p className="mt-4 font-bold">Complete</p>
                <p className="mt-1 text-sm text-slate-300">Follow the service outcome</p>
              </div>
            </div>
          </div>
        </section>

        <section id="process" className="px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-5xl">
            <div className="mx-auto mb-14 max-w-2xl text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                The request lifecycle
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                Seven steps from request to completion
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Each stage has a defined purpose, helping users and service
                providers understand what happens next.
              </p>
            </div>

            <div className="space-y-4">
              {stages.map((stage, index) => {
                const Icon = stage.icon

                return (
                  <div key={stage.number}>
                    <article className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:flex-row sm:items-start sm:p-7">
                      <div className="flex shrink-0 items-center gap-4 sm:w-44">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#101C2C] text-[#55E6A5]">
                          <Icon size={23} />
                        </div>
                        <span className="text-sm font-extrabold tracking-widest text-emerald-700">
                          STEP {stage.number}
                        </span>
                      </div>

                      <div className="flex-1">
                        <h3 className="text-xl font-extrabold">{stage.title}</h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {stage.description}
                        </p>
                        <p className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                          <span className="font-bold text-[#101C2C]">What this means: </span>
                          {stage.detail}
                        </p>
                      </div>
                    </article>

                    {index !== stages.length - 1 && (
                      <div className="flex justify-center py-2">
                        <ArrowDown size={19} className="text-emerald-600" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        <section className="bg-white px-5 py-20 sm:py-24">
          <div className="mx-auto max-w-7xl">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <span className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                Service-specific workflows
              </span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
                The final outcome depends on the service
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Each category has its own operational flow and completion
                conditions.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {serviceFlows.map((flow) => {
                const Icon = flow.icon

                return (
                  <article
                    key={flow.title}
                    className="rounded-2xl border border-slate-200 bg-[#F4F7FA] p-7"
                  >
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${flow.color}`}>
                      <Icon size={24} />
                    </div>
                    <h3 className="mt-6 text-xl font-extrabold">{flow.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {flow.description}
                    </p>
                    <div className="mt-6 border-t border-slate-200 pt-5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        Possible completion
                      </p>
                      <p className="mt-2 text-sm font-semibold leading-6 text-[#101C2C]">
                        {flow.outcome}
                      </p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:py-24">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-2">
            <div className="rounded-3xl bg-[#101C2C] p-8 text-white sm:p-10">
              <Wallet className="text-[#55E6A5]" size={28} />
              <h2 className="mt-5 text-2xl font-extrabold">
                How estimated pricing works
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                The planned pricing model combines the service or fuel cost,
                estimated travel distance and a service charge. The displayed
                quote is intended to make the cost components understandable.
              </p>
              <div className="mt-6 space-y-3">
                {['Fuel or base service cost', 'Estimated distance × travel rate', 'Applicable service charge'].map((item, index) => (
                  <div key={item} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#55E6A5] text-xs font-extrabold text-[#101C2C]">
                      {index + 1}
                    </span>
                    <span className="text-sm font-semibold">{item}</span>
                  </div>
                ))}
              </div>
              <p className="mt-5 text-xs leading-6 text-slate-400">
                This describes the planned calculation model. Actual pricing
                functionality will be implemented in a later development phase.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
              <ShieldCheck className="text-emerald-700" size={28} />
              <h2 className="mt-5 text-2xl font-extrabold">
                Safety and transparency
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                NexRoad is being designed around clear roles, controlled
                workflows and transparent request status.
              </p>
              <ul className="mt-6 space-y-4">
                {[
                  'Users choose when to share their location.',
                  'Technicians control their availability and location sharing.',
                  'Only eligible providers should receive a service request.',
                  'A request should have only one accepted provider.',
                  'Payment methods are demonstrated, not processed.',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                    <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-600" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto max-w-5xl rounded-3xl border border-amber-200 bg-amber-50 p-8 text-center sm:p-10">
            <ShieldCheck className="mx-auto text-amber-700" size={30} />
            <h2 className="mt-4 text-2xl font-extrabold">
              A demonstration, not a live dispatch service
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-sm leading-7 text-slate-700">
              NexRoad is a website prototype for demonstration and academic
              development in Chandigarh, India. Provider matching, service
              fulfilment, tracking, notifications and payments are simulated.
              No real technician is dispatched, no physical fuel or towing
              service is arranged, and no actual payment is processed.
            </p>
          </div>
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 rounded-3xl bg-[#101C2C] p-8 text-center text-white sm:p-10 md:flex-row md:text-left">
            <div>
              <h2 className="text-2xl font-extrabold sm:text-3xl">
                Explore the services NexRoad demonstrates.
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-300">
                Learn about the three roadside assistance categories.
              </p>
            </div>
            <Link
              to="/services"
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-[#55E6A5] px-6 py-3.5 font-bold text-[#101C2C] transition hover:bg-[#42d995]"
            >
              View services <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default HowItWorksPage
