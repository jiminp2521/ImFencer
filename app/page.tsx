import { redirect } from 'next/navigation';
import { HomePageClient } from '@/components/home/HomePageClient';
import { createClient } from '@/lib/supabase-server';

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2F');
  }

  return <HomePageClient />;
}
