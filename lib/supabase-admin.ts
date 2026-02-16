import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let adminClient: SupabaseClient | null = null;

const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

export const hasServiceRole = Boolean(serviceRoleKey);
export const hasUsableServiceRole = serviceRoleKey.startsWith('sb_secret_');

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const currentServiceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || !currentServiceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!hasUsableServiceRole) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY must be sb_secret_ format');
  }

  if (adminClient) {
    return adminClient;
  }

  adminClient = createClient(supabaseUrl, currentServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }) as SupabaseClient;

  return adminClient;
}
