import type { SupabaseClient } from '@supabase/supabase-js';

type EnsureProfileOptions = {
  updatedAt?: string;
};

/**
 * Many tables FK into `public.profiles`. If an auth user exists without a
 * corresponding profile row (common for legacy/test accounts), writes will fail
 * with FK violations. This helper ensures a minimal profile row exists.
 */
export async function ensureProfileRow(
  supabase: SupabaseClient,
  userId: string,
  options: EnsureProfileOptions = {}
) {
  const updatedAt = options.updatedAt ?? new Date().toISOString();

  const { error } = await supabase.from('profiles').upsert(
    {
      id: userId,
      updated_at: updatedAt,
    },
    {
      onConflict: 'id',
      ignoreDuplicates: true,
    }
  );

  if (error) {
    throw error;
  }
}

