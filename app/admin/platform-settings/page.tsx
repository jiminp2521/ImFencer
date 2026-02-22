import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { PlatformSettingsForm } from '@/components/admin/PlatformSettingsForm';
import { getDefaultPlatformSettings } from '@/lib/platform-settings';

const isAdminRole = (value: string | null | undefined) =>
  value === 'admin' || value === 'master' || value === 'operator';

export default async function PlatformSettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login?next=%2Fadmin%2Fplatform-settings');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to fetch profile in admin page:', profileError);
    redirect('/profile');
  }

  if (!isAdminRole(profile?.user_type || null)) {
    redirect('/profile');
  }

  const { data: settings, error: settingsError } = await supabase
    .from('platform_settings')
    .select('class_fee_rate, lesson_fee_rate, market_fee_rate, updated_at')
    .eq('code', 'default')
    .maybeSingle();

  if (settingsError) {
    console.error('Failed to fetch platform settings:', settingsError);
  }

  const defaults = getDefaultPlatformSettings();
  const classFeeRate = Number(settings?.class_fee_rate ?? defaults.classFeeRate);
  const lessonFeeRate = Number(settings?.lesson_fee_rate ?? defaults.lessonFeeRate);
  const marketFeeRate = Number(settings?.market_fee_rate ?? defaults.marketFeeRate);
  const updatedAt = settings?.updated_at
    ? new Date(settings.updated_at).toLocaleString('ko-KR', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null;

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/profile" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">플랫폼 수수료 관리</h1>
      </header>

      <main className="px-4 py-4 space-y-4">
        <section className="rounded-xl border border-white/10 bg-gray-950 p-4 space-y-2">
          <h2 className="text-base font-semibold text-white">수수료 설정</h2>
          <p className="text-xs text-gray-500">
            클래스/레슨/마켓 거래 시 자동 계산되는 플랫폼 수수료율입니다.
          </p>
          <PlatformSettingsForm
            initialClassFeeRate={classFeeRate}
            initialLessonFeeRate={lessonFeeRate}
            initialMarketFeeRate={marketFeeRate}
          />
          {updatedAt ? <p className="text-[11px] text-gray-600">마지막 업데이트: {updatedAt}</p> : null}
        </section>
      </main>
    </div>
  );
}
