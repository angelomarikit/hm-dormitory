import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getEnv } from '@/lib/env'

const { url, publishableKey } = getEnv()

function createPlaceholderClient(): SupabaseClient {
  return createClient('https://example.supabase.co', 'public-anon-key-placeholder', {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export const supabase: SupabaseClient =
  url && publishableKey
    ? createClient(url, publishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      })
    : createPlaceholderClient()
