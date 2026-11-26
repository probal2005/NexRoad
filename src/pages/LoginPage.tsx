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

const demoAccounts = [
  {
    label: 'Demo Customer',
    description: 'Test the customer experience',
    email: 'demo.user@example.com',
    password: 'NexRoadUser2026!',
    icon: UserRound,
  },
  {
    label: 'Demo Technician',
    description: 'Test the technician dashboard',
    email: 'demo.technician@example.com',
    password: 'NexRoadTech2026!',
    icon: Wrench,
  },
  {
    label: 'Demo Admin',
    description: 'Test administration features',
    email: 'demo.admin@example.com',
    password: 'NexRoadAdmin2026!',
    icon: ShieldCheck,
  },
]

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  function selectDemoAccount(email: string, password: string) {
    setValue('email', email, { shouldValidate: true })
    setValue('password', password, { shouldValidate: true })
    setError('root.server', { message: '' })
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading your account...
      </div>
    )
  }

  if (user) return <Navigate to="/account" replace />

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
              Choose a demo account to fill in its login credentials.
            </p>
          </div>

          <div className="space-y-3">
            {demoAccounts.map((account) => {
              const Icon = account.icon

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

                  <button
                    type="button"
                    onClick={() =>
                      selectDemoAccount(account.email, account.password)
                    }
                    className="shrink-0 rounded-lg bg-brand-navy px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                  >
                    Use account
                  </button>
                </div>
              )
            })}
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            Demo accounts must first be created in your Supabase project. These
            credentials are intended only for this prototype.
          </p>
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