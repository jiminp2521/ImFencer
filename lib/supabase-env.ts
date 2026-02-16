const read = (value: string | undefined) => value?.trim() || '';

export function getSupabaseUrl() {
  return read(process.env.NEXT_PUBLIC_SUPABASE_URL);
}

export function getSupabasePublishableKey() {
  return (
    read(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) ||
    read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export function getSupabaseKeySource() {
  if (read(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)) {
    return 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY';
  }

  if (read(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)) {
    return 'NEXT_PUBLIC_SUPABASE_ANON_KEY';
  }

  return '(missing)';
}
