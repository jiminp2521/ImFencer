import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { getAuthenticatedUserId } from '@/lib/auth-user';

export default async function MyProfilePage() {
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    redirect('/login?next=%2Fprofile');
  }

  return (
    <ProfileScreen
      profileUserId={userId}
      viewerUserId={userId}
      showOwnerMenu
      backHref={null}
      headerVariant="app"
    />
  );
}
