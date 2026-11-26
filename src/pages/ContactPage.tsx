import { useState, type FormEvent } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Mail,
  MapPin,
  MessageSquare,
  Send,
  ShieldCheck,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import PublicFooter from '../components/layout/PublicFooter'
import PublicNavbar from '../components/layout/PublicNavbar'

type ContactValues = {
  name: string
  email: string
  subject: string
  message: string
}

type ContactErrors = Partial<Record<keyof ContactValues, string>>

const initialValues: ContactValues = {
  name: '',
  email: '',
  subject: '',
  message: '',
}

function validate(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {}

  if (!values.name.trim()) {
    errors.name = 'Please enter your name.'
  } else if (values.name.trim().length < 2) {
    errors.name = 'Name must contain at least 2 characters.'
  } else if (values.name.trim().length > 80) {
    errors.name = 'Name cannot exceed 80 characters.'
  }

  const email = values.email.trim()
  if (!email) {
    errors.email = 'Please enter your email address.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Please enter a valid email address.'
  } else if (email.length > 254) {
    errors.email = 'Email address is too long.'
  }

  if (!values.subject.trim()) {
    errors.subject = 'Please enter a subject.'
  } else if (values.subject.trim().length < 3) {
    errors.subject = 'Subject must contain at least 3 characters.'
  } else if (values.subject.trim().length > 120) {
    errors.subject = 'Subject cannot exceed 120 characters.'
  }

  if (!values.message.trim()) {
    errors.message = 'Please enter your message.'
  } else if (values.message.trim().length < 10) {
    errors.message = 'Message must contain at least 10 characters.'
  } else if (values.message.trim().length > 2000) {
    errors.message = 'Message cannot exceed 2,000 characters.'
  }

  return errors
}

function ContactPage() {
  const [values, setValues] = useState<ContactValues>(initialValues)
  const [errors, setErrors] = useState<ContactErrors>({})
  const [submitted, setSubmitted] = useState(false)

  function updateField(field: keyof ContactValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitted(false)
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const validationErrors = validate(values)
    setErrors(validationErrors)

    if (Object.keys(validationErrors).length > 0) {
      setSubmitted(false)
      return
    }

    // Demonstration only: no message is sent or stored.
    setSubmitted(true)
    setValues(initialValues)
    setErrors({})
  }

  const inputClass =
    'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#101C2C] outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10'

  return (
    <div className="min-h-screen overflow-hidden bg-[#F4F7FA] text-[#101C2C]">
      <PublicNavbar />

      <main>
        <section className="relative overflow-hidden bg-[#101C2C] px-5 py-20 text-white sm:py-24">
          <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full border border-white/10" />
          <div className="pointer-events-none absolute -right-10 -top-10 h-64 w-64 rounded-full border border-white/10" />

          <div className="relative mx-auto max-w-7xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#55E6A5]/30 bg-[#55E6A5]/10 px-4 py-2 text-sm font-semibold text-[#55E6A5]">
              <MessageSquare size={15} />
              Contact NexRoad
            </span>

            <div className="mt-7 max-w-3xl">
              <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                Let's start a
                <span className="block text-[#55E6A5]">conversation.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Have a question about the NexRoad project, its service
                workflows or the demonstration platform? Use the contact form
                to prepare a message.
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <aside className="space-y-6">
              <div>
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Get in touch
                </span>
                <h2 className="mt-3 text-3xl font-extrabold">
                  About this project
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  NexRoad is a roadside assistance website prototype focused on
                  demonstrating how users, service providers and administrators
                  can interact through a unified platform.
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                    <MapPin size={21} />
                  </div>
                  <div>
                    <h3 className="font-bold">Demonstration area</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Chandigarh, India
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Initial demonstration city for the project.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                    <Clock3 size={21} />
                  </div>
                  <div>
                    <h3 className="font-bold">Project status</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      Website prototype in development.
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Features and workflows are being implemented in phases.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                    <ShieldCheck size={21} />
                  </div>
                  <div>
                    <h3 className="font-bold">Prototype notice</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      The contact form currently validates input locally.
                      Messages are not transmitted or stored.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-[#101C2C] p-6 text-white">
                <h3 className="font-bold">Explore NexRoad</h3>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Learn about the services and how their demonstration
                  workflows are designed.
                </p>
                <div className="mt-5 flex flex-wrap gap-4">
                  <Link
                    to="/services"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#55E6A5] hover:underline"
                  >
                    Our services <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/how-it-works"
                    className="inline-flex items-center gap-2 text-sm font-bold text-[#55E6A5] hover:underline"
                  >
                    How it works <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </aside>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
              <div className="mb-8">
                <span className="text-sm font-bold uppercase tracking-[0.2em] text-emerald-700">
                  Contact form
                </span>
                <h2 className="mt-3 text-2xl font-extrabold sm:text-3xl">
                  Send us a message
                </h2>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Complete the fields below. All fields are required.
                </p>
              </div>

              {submitted && (
                <div
                  role="status"
                  className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900"
                >
                  <CheckCircle2 className="mt-0.5 shrink-0" size={20} />
                  <div>
                    <p className="font-bold">Form validation successful</p>
                    <p className="mt-1 text-sm leading-6">
                      Your message passed the local validation check. This
                      prototype does not send or save messages.
                    </p>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label htmlFor="contact-name" className="text-sm font-bold">
                      Full name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      maxLength={80}
                      value={values.name}
                      onChange={(event) => updateField('name', event.target.value)}
                      placeholder="Enter your name"
                      className={inputClass}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    />
                    {errors.name && (
                      <p id="contact-name-error" className="mt-2 text-xs font-medium text-red-600">
                        {errors.name}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="contact-email" className="text-sm font-bold">
                      Email address
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      maxLength={254}
                      value={values.email}
                      onChange={(event) => updateField('email', event.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    />
                    {errors.email && (
                      <p id="contact-email-error" className="mt-2 text-xs font-medium text-red-600">
                        {errors.email}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-5">
                  <label htmlFor="contact-subject" className="text-sm font-bold">
                    Subject
                  </label>
                  <input
                    id="contact-subject"
                    name="subject"
                    type="text"
                    maxLength={120}
                    value={values.subject}
                    onChange={(event) => updateField('subject', event.target.value)}
                    placeholder="What is your message about?"
                    className={inputClass}
                    aria-invalid={Boolean(errors.subject)}
                    aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                  />
                  {errors.subject && (
                    <p id="contact-subject-error" className="mt-2 text-xs font-medium text-red-600">
                      {errors.subject}
                    </p>
                  )}
                </div>

                <div className="mt-5">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="contact-message" className="text-sm font-bold">
                      Your message
                    </label>
                    <span className="text-xs text-slate-400">
                      {values.message.length}/2000
                    </span>
                  </div>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={6}
                    maxLength={2000}
                    value={values.message}
                    onChange={(event) => updateField('message', event.target.value)}
                    placeholder="Write your message here..."
                    className={`${inputClass} resize-y`}
                    aria-invalid={Boolean(errors.message)}
                    aria-describedby={errors.message ? 'contact-message-error' : undefined}
                  />
                  {errors.message && (
                    <p id="contact-message-error" className="mt-2 text-xs font-medium text-red-600">
                      {errors.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#101C2C] px-6 py-3.5 font-bold text-white transition hover:bg-[#1b3049] focus:outline-none focus:ring-4 focus:ring-emerald-500/20 sm:w-auto"
                >
                  Validate message <Send size={17} />
                </button>

                <p className="mt-4 text-xs leading-5 text-slate-500">
                  Demo only: submitting this form does not send an email or
                  transmit your information to a server.
                </p>
              </form>
            </section>
          </div>
        </section>

        <section className="px-5 pb-20">
          <div className="mx-auto max-w-7xl rounded-3xl border border-slate-200 bg-white p-8 text-center sm:p-10">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
              <Mail size={23} />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold">
              Looking for project information?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600">
              Explore the About page for the project's vision, objectives,
              platform scope and development principles.
            </p>
            <Link
              to="/about"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#55E6A5] px-6 py-3 font-bold text-[#101C2C] transition hover:bg-[#42d995]"
            >
              About NexRoad <ArrowRight size={17} />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  )
}

export default ContactPage
