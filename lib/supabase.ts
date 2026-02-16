import { createBrowserClient } from '@supabase/ssr'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env'

export const createClient = () =>
  createBrowserClient(
    getSupabaseUrl(),
    getSupabasePublishableKey()
  )
