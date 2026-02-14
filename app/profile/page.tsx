import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase-server';
import { ProfileScreen } from '@/components/profile/ProfileScreen';

export default async function MyProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fprofile');
  }

  return (
    <ProfileScreen
      profileUserId={user.id}
      viewerUserId={user.id}
      showOwnerMenu
      backHref={null}
    />
  );
}

