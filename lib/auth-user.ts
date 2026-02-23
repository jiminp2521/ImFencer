import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Prefer JWT claims to avoid an extra auth round trip when possible.
 * Falls back to getUser for compatibility with non-asymmetric signing setups.
 */
export async function getAuthenticatedUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const claimsResult = await supabase.auth.getClaims();
  const userIdFromClaims = claimsResult.data?.claims?.sub;

  if (typeof userIdFromClaims === 'string' && userIdFromClaims.length > 0) {
    return userIdFromClaims;
  }

  // No session token exists in the current request context.
  if (!claimsResult.data && !claimsResult.error) {
    return null;
  }

  if (claimsResult.error?.name === 'AuthSessionMissingError') {
    return null;
  }

  const userResult = await supabase.auth.getUser();
  return userResult.data.user?.id || null;
}
