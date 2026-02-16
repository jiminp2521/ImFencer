import { createClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

export function createPublicClient() {
  return createClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
