import type { ReactNode } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../auth/useAuth'
import AuthLoadingScreen from './AuthLoadingScreen'

interface ProtectedRouteProps {
  children: ReactNode
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const location = useLocation()

  const {
    user,
    profile,
    loading,
    profileLoading,
    refreshProfile,
  } = useAuth()

  if (loading) {
    return <AuthLoadingScreen />
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    )
  }

  if (profileLoading) {
    return <AuthLoadingScreen message="Loading your profile..." />
  }

  if (!profile || profile.id !== user.id) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-brand-navy">
            Profile unavailable
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            We could not load your account profile. Please try again.
            If the problem continues, contact support.
          </p>

          <button
            type="button"
            onClick={() => void refreshProfile()}
            className="mt-6 rounded-xl bg-brand-green px-5 py-3 text-sm font-bold text-brand-navy hover:bg-emerald-300"
          >
            Retry profile loading
          </button>

          <div className="mt-4">
            <Link
              to="/"
              className="text-sm font-medium text-slate-500 hover:text-brand-navy"
            >
              Back to homepage
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return <>{children}</>
}
