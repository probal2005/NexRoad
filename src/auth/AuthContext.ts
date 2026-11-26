import { createContext } from 'react'
import type { Session, User } from '@supabase/supabase-js'

export type UserRole = 'user' | 'technician' | 'admin'

export interface UserProfile {
  id: string
  full_name: string
  phone: string | null
  avatar_url: string | null
  role: UserRole
  created_at: string
  updated_at: string
}

export interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: UserProfile | null
  role: UserRole | null
  loading: boolean
  profileLoading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
)
