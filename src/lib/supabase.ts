import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { validatePublicSupabaseConfig } from './publicSupabaseConfig'

const config = validatePublicSupabaseConfig(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
)

export const supabase = createClient<Database>(
  config.url,
  config.key,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  },
)
