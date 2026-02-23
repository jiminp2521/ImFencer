import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { AvatarStudioClient } from '@/components/profile/AvatarStudioClient';

export default async function AvatarStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fprofile%2Favatar');
  }

  try {
    await ensureProfileRow(supabase, user.id);
  } catch (error) {
    console.error('Error ensuring profile row before avatar studio:', error);
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('Error loading avatar studio profile:', error);
  }

  return (
    <AvatarStudioClient
      initialAvatarUrl={profile?.avatar_url || null}
      seed={user.id}
      displayName={profile?.username || 'Fencer'}
    />
  );
}
