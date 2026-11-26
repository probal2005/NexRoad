import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  UserRound,
  Wrench,
  ShieldCheck,
} from 'lucide-react'

import AuthLayout from '../components/auth/AuthLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const loginSchema = z.object({
  email: z.string().trim()
    .email('Enter a valid email address.')
    .max(254, 'Email address is too long.'),
  password: z.string().min(1, 'Password is required.'),
})

type LoginFormValues = z.infer<typeof loginSchema>

const loopbackHosts = ['localhost', '127.0.0.1', '[::1]']
const localDemoPasswords = import.meta.env.DEV
  && loopbackHosts.includes(window.location.hostname)
  && loopbackHosts.includes(new URL(import.meta.env.VITE_SUPABASE_URL).hostname)
  ? {
    user: import.meta.env.VITE_LOCAL_DEMO_CUSTOMER_PASSWORD as string | undefined,
    technician: import.meta.env.VITE_LOCAL_DEMO_TECHNICIAN_PASSWORD as string | undefined,
    admin: import.meta.env.VITE_LOCAL_DEMO_ADMIN_PASSWORD as string | undefined,
  }
  : null

const demoAccounts = [
  {
    role: 'user',
    label: 'Demo Customer',
    description: 'Test the customer experience',
    email: 'demo.user@example.com',
    icon: UserRound,
  },
  {
    role: 'technician',
    label: 'Demo Technician',
    description: 'Test the technician dashboard',
    email: 'demo.technician@example.com',
    icon: Wrench,
  },
  {
    role: 'admin',
    label: 'Demo Admin',
    description: 'Test administration features',
    email: 'demo.admin@example.com',
    icon: ShieldCheck,
  },
] as const

export default function LoginPage() {
  const { user, role, profileLoading, loading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    clearErrors,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  function selectDemoAccount(account: (typeof demoAccounts)[number]) {
    const password = localDemoPasswords?.[account.role] ?? ''
    clearErrors('root.server')
    clearErrors('password')
    setValue('email', account.email, { shouldValidate: true })
    setValue('password', password, { shouldDirty: true })
    setShowPassword(Boolean(password))
  }

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading your account...
      </div>
    )
  }

  if (user) {
    const dashboard = role === 'admin'
      ? '/admin/dashboard'
      : role === 'technician'
        ? '/technician/dashboard'
        : role === 'user' ? '/dashboard' : '/account'
    return <Navigate to={dashboard} replace />
  }

  async function onSubmit(values: LoginFormValues) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email.trim().toLowerCase(),
        password: values.password,
      })

      if (error) {
        setError('root.server', {
          type: 'server',
          message:
            error.message === 'Invalid login credentials'
              ? 'Incorrect email or password. Please try again.'
              : error.message,
        })
      }
    } catch {
      setError('root.server', {
        type: 'server',
        message: 'Unable to sign in right now. Please try again.',
      })
    }
  }

  return (
    <AuthLayout
      title="Welcome back"
      description="Sign in to continue to your NexRoad account."
      footerText="New to NexRoad?"
      footerLinkText="Create an account"
      footerTo="/register"
    >
      <div className="space-y-5">
        <Card padding="lg" className="shadow-xl shadow-slate-900/[0.04]">
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-5">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                leftIcon={<Mail size={17} />}
                error={errors.email?.message}
                required
                {...register('email')}
              />

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  leftIcon={<LockKeyhole size={17} />}
                  error={errors.password?.message}
                  className="pr-12"
                  required
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-[43px] rounded-md p-1 text-slate-400 hover:text-brand-navy"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {errors.root?.server?.message && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {errors.root.server.message}
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isSubmitting}
              className="mt-7"
            >
              Sign in
            </Button>
          </form>
        </Card>

        <Card padding="lg" className="border border-emerald-100 bg-emerald-50/40">
          <div className="mb-4">
            <p className="text-sm font-bold text-brand-navy">
              Try NexRoad Demo
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Try a role with sample data. No sign-in is required.
            </p>
          </div>

          <div className="space-y-3">
            {demoAccounts.map((account) => {
              const Icon = account.icon
              const fillsPassword = Boolean(localDemoPasswords?.[account.role])

              return (
                <div
                  key={account.email}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
                      <Icon size={18} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-navy">
                        {account.label}
                      </p>
                      <p className="text-xs text-slate-500">
                        {account.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-2">
                    <Link
                      to={`/demo/${account.role === 'user' ? 'customer' : account.role}`}
                      aria-label={`Open ${account.label}`}
                      className="rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                    >
                      Open demo
                    </Link>
                    {fillsPassword && (
                      <button type="button" onClick={() => selectDemoAccount(account)}
                        aria-label={`Fill local sign-in for ${account.label}`}
                        className="text-xs font-semibold text-emerald-800 hover:underline">
                        Fill local sign-in
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

        </Card>
      </div>

      <p className="mt-5 text-center text-xs text-slate-400">
        Need help?{' '}
        <Link to="/contact" className="font-semibold text-emerald-700">
          Contact NexRoad
        </Link>
      </p>
    </AuthLayout>
  )
}