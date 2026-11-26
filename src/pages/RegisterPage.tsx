import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import {
  Eye,
  EyeOff,
  Mail,
  UserRound,
  LockKeyhole,
  CheckCircle2,
  Wrench,
} from 'lucide-react'

import AuthLayout from '../components/auth/AuthLayout'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import Input from '../components/ui/Input'
import { useAuth } from '../auth/useAuth'
import { supabase } from '../lib/supabase'

const registerSchema = z
  .object({
    fullName: z.string().trim()
      .min(2, 'Name must contain at least 2 characters.')
      .max(80, 'Name cannot exceed 80 characters.'),
    email: z.string().trim()
      .email('Enter a valid email address.')
      .max(254, 'Email address is too long.'),
    accountType: z.enum(['user', 'technician']),
    password: z.string()
      .min(8, 'Password must contain at least 8 characters.')
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[a-z]/, 'Include at least one lowercase letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type RegisterFormValues = z.infer<typeof registerSchema>

export default function RegisterPage() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const {
    register,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      accountType: 'user',
      password: '',
      confirmPassword: '',
    },
  })

  const selectedAccountType = watch('accountType')

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Loading your account...
      </div>
    )
  }

  if (user) return <Navigate to="/" replace />

  async function onSubmit(values: RegisterFormValues) {
    setSuccessMessage('')

    try {
      const { data, error } = await supabase.auth.signUp({
        email: values.email.trim().toLowerCase(),
        password: values.password,
        options: {
          data: {
            full_name: values.fullName.trim(),
            requested_role: values.accountType,
          },
        },
      })

      if (error) {
        setError('root.server', {
          type: 'server',
          message: error.message,
        })
        return
      }

      const applicationMessage =
        values.accountType === 'technician'
          ? ' Your technician application has been submitted and is pending admin approval.'
          : ''

      if (data.session) {
        navigate('/account', { replace: true })
        return
      }

      setSuccessMessage(
        `Your account has been created. Check your email for a verification link before signing in.${applicationMessage}`,
      )
    } catch {
      setError('root.server', {
        type: 'server',
        message: 'Something went wrong. Please try again.',
      })
    }
  }

  return (
    <AuthLayout
      title="Create your account"
      description="Join NexRoad and get roadside assistance when you need it."
      footerText="Already have an account?"
      footerLinkText="Sign in"
      footerTo="/login"
    >
      <Card padding="lg" className="shadow-xl shadow-slate-900/[0.04]">
        {successMessage ? (
          <div className="py-5 text-center">
            <CheckCircle2 size={48} className="mx-auto mb-4 text-emerald-600" />
            <h2 className="text-xl font-bold text-brand-navy">
              Account created
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              {successMessage}
            </p>
            <Button
              fullWidth
              className="mt-7"
              onClick={() => navigate('/login')}
            >
              Continue to sign in
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate>
            <div className="space-y-5">
              <Input
                label="Full name"
                placeholder="Enter your full name"
                autoComplete="name"
                leftIcon={<UserRound size={17} />}
                error={errors.fullName?.message}
                required
                {...register('fullName')}
              />

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

              <div>
                <label
                  htmlFor="accountType"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Select account type
                </label>
                <select
                  id="accountType"
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  {...register('accountType')}
                >
                  <option value="user">Customer — Request roadside assistance</option>
                  <option value="technician">Technician — Apply to provide services</option>
                </select>
                {errors.accountType?.message && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.accountType.message}
                  </p>
                )}

                <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
                  {selectedAccountType === 'technician' ? (
                    <div className="flex gap-2">
                      <Wrench size={16} className="mt-0.5 shrink-0 text-emerald-700" />
                      <p>
                        You will register as a customer first. Your technician
                        application will be sent for admin approval. Technician
                        dashboard access is granted only after approval.
                      </p>
                    </div>
                  ) : (
                    <p>
                      Create a customer account to request fuel, mechanical
                      assistance or towing.
                    </p>
                  )}
                </div>
              </div>

              <div className="relative">
                <Input
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Create a strong password"
                  autoComplete="new-password"
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

              <div className="relative">
                <Input
                  label="Confirm password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Enter your password again"
                  autoComplete="new-password"
                  leftIcon={<LockKeyhole size={17} />}
                  error={errors.confirmPassword?.message}
                  className="pr-12"
                  required
                  {...register('confirmPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((current) => !current)}
                  aria-label={
                    showConfirmPassword ? 'Hide password' : 'Show password'
                  }
                  className="absolute right-3 top-[43px] rounded-md p-1 text-slate-400 hover:text-brand-navy"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <p className="mt-4 text-xs leading-5 text-slate-500">
              Password must have at least 8 characters, one uppercase letter,
              one lowercase letter, and one number.
            </p>

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
              className="mt-6"
            >
              Create account
            </Button>

            <p className="mt-5 text-center text-xs leading-5 text-slate-400">
              NexRoad is currently a demonstration platform.
            </p>
          </form>
        )}
      </Card>

      <p className="mt-5 text-center text-xs text-slate-400">
        Need help?{' '}
        <Link to="/contact" className="font-semibold text-emerald-700">
          Contact NexRoad
        </Link>
      </p>
    </AuthLayout>
  )
}