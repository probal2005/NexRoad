import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '../lib/supabase'
import { AuthContext } from './AuthContext'
import type { UserProfile } from './AuthContext'

interface AuthProviderProps {
  children: ReactNode
}

interface ProfileResult {
  userId: string
  profile: UserProfile | null
  loading: boolean
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileResult, setProfileResult] = useState<ProfileResult | null>(null)
  const profileRequest = useRef<AbortController | null>(null)
  const userId = session?.user.id ?? null

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        profileRequest.current?.abort()
        setProfileResult(null)
      }

      setSession(currentSession)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return

    profileRequest.current?.abort()
    const controller = new AbortController()
    profileRequest.current = controller
    setProfileResult({ userId, profile: null, loading: true })

    let profile: UserProfile | null = null

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, avatar_url, role, created_at, updated_at')
        .eq('id', userId)
        .abortSignal(controller.signal)
        .maybeSingle()

      if (error) throw error

      if (data) {
        const { role } = data
        if (role === 'user' || role === 'technician' || role === 'admin') {
          profile = { ...data, role }
        }
      }
    } catch (error: unknown) {
      if (!controller.signal.aborted) {
        console.error('Unable to load account profile:', error)
      }
    } finally {
      if (!controller.signal.aborted) {
        setProfileResult({ userId, profile, loading: false })
      }
    }
  }, [userId])

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (active) void refreshProfile()
    })
    return () => {
      active = false
      profileRequest.current?.abort()
    }
  }, [refreshProfile])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) throw error
  }, [])

  const currentProfile = userId && profileResult?.userId === userId
    ? profileResult.profile
    : null
  const profileLoading = userId !== null
    && (profileResult?.userId !== userId || profileResult.loading)

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: currentProfile,
      role: currentProfile?.role ?? null,
      loading,
      profileLoading,
      refreshProfile,
      signOut,
    }),
    [session, currentProfile, loading, profileLoading, refreshProfile, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
