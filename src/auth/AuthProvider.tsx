import {
  useCallback,
  useEffect,
  useMemo,
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

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(false)

  const userId = session?.user.id ?? null

  useEffect(() => {
    let mounted = true

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (mounted) {
        setSession(currentSession)
        setLoading(false)
      }
    })

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!mounted) return

        if (error) {
          console.error('Unable to restore authentication session:', error)
          setSession(null)
        } else {
          setSession(data.session)
        }

        setLoading(false)
      })
      .catch((error: unknown) => {
        if (!mounted) return

        console.error('Authentication initialization failed:', error)
        setSession(null)
        setLoading(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    let active = true

    if (!userId) {
      return () => {
        active = false
      }
    }

    async function loadProfile() {
      setProfileLoading(true)

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select(
            'id, full_name, phone, avatar_url, role, created_at, updated_at',
          )
          .eq('id', userId)
          .maybeSingle()

        if (!active) return

        if (error) {
          console.error('Unable to load user profile:', error)
          setProfile(null)
        } else {
          setProfile(data as UserProfile | null)
        }
      } finally {
        if (active) {
          setProfileLoading(false)
        }
      }
    }

    void loadProfile().catch((error: unknown) => {
      if (active) {
        console.error('Profile loading failed:', error)
        setProfile(null)
        setProfileLoading(false)
      }
    })

    return () => {
      active = false
    }
  }, [userId])

  const refreshProfile = useCallback(async () => {
    if (!userId) {
      setProfile(null)
      return
    }

    setProfileLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select(
          'id, full_name, phone, avatar_url, role, created_at, updated_at',
        )
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      setProfile(data as UserProfile | null)
    } catch (error) {
      console.error('Unable to refresh user profile:', error)
      throw error
    } finally {
      setProfileLoading(false)
    }
  }, [userId])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw error
    }
  }, [])

  const currentProfile =
    userId && profile?.id === userId ? profile : null

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile: currentProfile,
      role: currentProfile?.role ?? null,
      loading,
      profileLoading: Boolean(userId) && profileLoading,
      refreshProfile,
      signOut,
    }),
    [
      session,
      currentProfile,
      loading,
      userId,
      profileLoading,
      refreshProfile,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
