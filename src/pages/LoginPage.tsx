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

export default function LoginPage() {
  const { user, role, profileLoading, loading: authLoading } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [copyStatus, setCopyStatus] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  async function copyField(form: HTMLFormElement | null, field: keyof LoginFormValues) {
    const label = field === 'email' ? 'Email address' : 'Password'
    const value = form && new FormData(form).get(field)
    if (typeof value !== 'string' || !value) {
      setCopyStatus(`Enter your ${label.toLowerCase()} first.`)
      return
    }

    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus(`${label} copied.`)
    } catch {
      setCopyStatus('Clipboard access is unavailable. Select the text and copy it manually.')
    }
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
      <Card padding="lg" className="shadow-xl shadow-slate-900/[0.04]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="space-y-5">
            <div className="relative">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                leftIcon={<Mail size={17} />}
                error={errors.email?.message}
                className="pr-20"
                required
                {...register('email')}
              />
              <button
                type="button"
                aria-label="Copy email address"
                onClick={(event) => void copyField(event.currentTarget.form, 'email')}
                className="absolute right-2 top-8 min-h-9 rounded-lg px-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2"
              >
                Copy
              </button>
            </div>

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                leftIcon={<LockKeyhole size={17} />}
                error={errors.password?.message}
                className="pr-28"
                required
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-14 top-8 flex min-h-9 items-center rounded-md px-2 text-slate-600 hover:text-brand-navy focus-visible:outline-2"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
              <button
                type="button"
                aria-label="Copy password"
                onClick={(event) => void copyField(event.currentTarget.form, 'password')}
                className="absolute right-2 top-8 min-h-9 rounded-lg px-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 focus-visible:outline-2"
              >
                Copy
              </button>
            </div>
          </div>

          <p role="status" className="mt-2 min-h-5 text-sm text-slate-700">{copyStatus}</p>

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

      <p className="mt-5 text-center text-xs text-slate-600">
        Need help?{' '}
        <Link to="/contact" className="font-semibold text-emerald-800">
          Contact NexRoad
        </Link>
      </p>
    </AuthLayout>
  )
}
