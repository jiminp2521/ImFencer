import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase-server';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { SetMyClubButton } from '@/components/fencing/SetMyClubButton';

type ClubsPageProps = {
  searchParams: Promise<{
    q?: string;
  }>;
};

type ClubRow = {
  id: string;
  owner_id: string | null;
  name: string;
  city: string;
  address: string;
  phone: string | null;
  description: string | null;
};

type ClassCountRow = {
  club_id: string;
};

const CLUB_LIST_LIMIT = 60;

export default async function FencingClubsPage({ searchParams }: ClubsPageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const queryText = (resolvedSearchParams.q || '').trim();

  let clubsQuery = supabase
    .from('fencing_clubs')
    .select('id, owner_id, name, city, address, phone, description')
    .order('created_at', { ascending: false })
    .limit(CLUB_LIST_LIMIT);

  if (queryText) {
    const escaped = queryText.replace(/[%_]/g, '');
    clubsQuery = clubsQuery.or(
      `name.ilike.%${escaped}%,city.ilike.%${escaped}%,address.ilike.%${escaped}%`
    );
  }

  const clubsResult = await clubsQuery;

  const clubs = (clubsResult.data || []) as ClubRow[];
  const clubIds = clubs.map((club) => club.id);

  const [classCountResult, myProfileResult] = await Promise.all([
    clubIds.length > 0
      ? supabase
          .from('fencing_club_classes')
          .select('club_id')
          .in('club_id', clubIds)
          .eq('status', 'open')
      : Promise.resolve({ data: [], error: null }),
    user
      ? supabase.from('profiles').select('club_id').eq('id', user.id).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (clubsResult.error) {
    console.error('Error fetching fencing clubs:', clubsResult.error);
  }
  if (classCountResult.error) {
    console.error('Error fetching fencing class counts:', classCountResult.error);
  }
  if (myProfileResult.error) {
    console.error('Error fetching my profile club:', myProfileResult.error);
  }

  const classCountRows = (classCountResult.data || []) as ClassCountRow[];
  const myClubId = myProfileResult.data?.club_id || null;

  const classCountByClub = new Map<string, number>();
  for (const item of classCountRows) {
    classCountByClub.set(item.club_id, (classCountByClub.get(item.club_id) || 0) + 1);
  }

  const schemaMissing = [clubsResult.error, classCountResult.error].some(
    (error) => error?.code === '42P01'
  );

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-white/10 h-14 px-4 flex items-center">
        <Link href="/fencing" className="text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-base font-semibold text-white ml-2">주변 클럽 찾기</h1>
      </header>

      <div className="px-4 py-3 border-b border-white/5 space-y-2">
        <form action="/fencing/clubs" className="flex gap-2">
          <input
            type="text"
            name="q"
            defaultValue={queryText}
            placeholder="도시/클럽명/주소 검색"
            className="h-9 w-full rounded-md border border-gray-800 bg-gray-950 px-3 text-sm text-gray-100 placeholder:text-gray-500 outline-none focus:border-blue-500/60"
          />
          <Button
            type="submit"
            variant="outline"
            className="h-9 border-gray-700 bg-gray-950 text-gray-200 hover:bg-gray-900"
          >
            검색
          </Button>
        </form>
        {myClubId ? (
          <p className="text-xs text-emerald-400">내 소속 클럽이 설정되어 있습니다.</p>
        ) : (
          <p className="text-xs text-gray-500">
            소속 클럽을 설정하면 커뮤니티에서 `내 클럽` 피드를 볼 수 있습니다.
          </p>
        )}
      </div>

      <main className="px-4 py-4 space-y-2">
        {schemaMissing ? (
          <section className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-amber-300">클럽 테이블이 아직 없습니다.</p>
            <p className="text-xs text-amber-200/90">DB에 `migration.sql`의 펜싱 섹션을 반영해주세요.</p>
          </section>
        ) : null}

        {clubs.length > 0 ? (
          clubs.map((club) => (
            <article
              key={club.id}
              className="rounded-xl border border-white/10 bg-gray-950 px-4 py-3 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-white">{club.name}</p>
                  <p className="text-xs text-gray-400">{club.city}</p>
                </div>
                <Badge className="border-white/10 bg-gray-900 text-gray-300">
                  클래스 {classCountByClub.get(club.id) || 0}
                </Badge>
              </div>

              <p className="text-xs text-gray-300">{club.description || '클럽 소개가 아직 등록되지 않았습니다.'}</p>
              <p className="text-xs text-gray-500">{club.address}</p>
              {club.phone ? <p className="text-xs text-gray-500">전화: {club.phone}</p> : null}

              <div className="flex flex-wrap gap-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                >
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      `${club.name} ${club.address}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    지도 보기
                  </a>
                </Button>

                <SetMyClubButton
                  clubId={club.id}
                  clubName={club.name}
                  loginNext="/fencing/clubs"
                  isCurrent={Boolean(myClubId && myClubId === club.id)}
                />

                {club.owner_id ? (
                  <StartChatButton
                    targetUserId={club.owner_id}
                    contextTitle={club.name}
                    openingMessage={`${club.name} 클럽 문의드립니다.`}
                    loginNext="/fencing/clubs"
                    label="클럽 채팅"
                    size="sm"
                    variant="ghost"
                    className="text-gray-300 hover:text-white"
                  />
                ) : null}
              </div>
            </article>
          ))
        ) : (
          <div className="rounded-xl border border-white/10 bg-gray-950 px-4 py-14 text-center text-sm text-gray-500">
            등록된 클럽 정보가 없습니다.
          </div>
        )}
      </main>
    </div>
  );
}
