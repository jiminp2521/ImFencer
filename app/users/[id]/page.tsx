import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { createClient } from '@/lib/supabase-server';

type UserProfilePageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ next?: string }>;
};

const sanitizeNext = (value: string | undefined) => {
  if (!value) return null;
  if (!value.startsWith('/')) return null;
  if (value.startsWith('//')) return null;
  return value;
};

export default async function UserProfilePage({ params, searchParams }: UserProfilePageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const backHref = sanitizeNext(resolvedSearchParams.next);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <ProfileScreen
      profileUserId={id}
      viewerUserId={user?.id || null}
      showOwnerMenu={false}
      backHref={backHref || '/'}
    />
  );
}

