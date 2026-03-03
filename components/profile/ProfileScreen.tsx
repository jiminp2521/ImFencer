import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft, Grid3X3 } from 'lucide-react';
import { Suspense } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { createClient } from '@/lib/supabase-server';
import { ProfileMenuButton } from '@/components/profile/ProfileMenuButton';
import { ensureProfileRow } from '@/lib/ensure-profile';

const weaponMap: Record<string, string> = {
  Fleuret: '플뢰레',
  Epee: '에페',
  Sabre: '사브르',
};

const categoryMap: Record<string, string> = {
  Free: '자유',
  Info: '정보',
  Question: '질문',
};

type ProfileRow = {
  username: string | null;
  weapon_type: string | null;
  tier: string | null;
  avatar_url: string | null;
  user_type: string | null;
  club_id: string | null;
};

type PostRow = {
  id: string;
  title: string;
  category: string;
  created_at: string;
};

type ProfileScreenProps = {
  profileUserId: string;
  viewerUserId: string | null;
  showOwnerMenu?: boolean;
  backHref?: string | null;
  headerVariant?: 'default' | 'app';
};

type ProfileActivitySectionProps = {
  profileUserId: string;
  displayName: string;
  isOwner: boolean;
};

const toSafeAvatarSrc = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('https://') ? trimmed : null;
};

const formatCount = (value: number) => value.toLocaleString('ko-KR');

function ProfileMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="py-3 text-center">
      <p className="text-base font-semibold text-white">{formatCount(value)}</p>
      <p className="text-[11px] text-slate-500">{label}</p>
    </div>
  );
}

async function ProfileActivitySection({
  profileUserId,
  displayName,
  isOwner,
}: ProfileActivitySectionProps) {
  const supabase = await createClient();

  const [postsCountResult, likeCountResult, awardsCountResult, postsResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id', { count: 'exact', head: true })
      .eq('author_id', profileUserId),
    supabase
      .from('post_likes')
      .select('post_id, posts:post_id!inner (author_id)', { count: 'exact', head: true })
      .eq('posts.author_id', profileUserId),
    supabase
      .from('awards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', profileUserId),
    supabase
      .from('posts')
      .select('id, title, category, created_at')
      .eq('author_id', profileUserId)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);

  if (postsCountResult.error) {
    console.error('Error fetching posts count:', postsCountResult.error);
  }
  if (likeCountResult.error && likeCountResult.error.code !== '42P01') {
    console.error('Error fetching received likes count:', likeCountResult.error);
  }
  if (awardsCountResult.error && awardsCountResult.error.code !== '42P01') {
    console.error('Error fetching awards count:', awardsCountResult.error);
  }
  if (postsResult.error) {
    console.error('Error fetching profile posts:', postsResult.error);
  }

  const postCount = postsCountResult.count || 0;
  const receivedLikeCount = likeCountResult.count || 0;
  const awardCount = awardsCountResult.count || 0;
  const posts = (postsResult.data || []) as PostRow[];

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
        <div className="grid grid-cols-3 divide-x divide-white/10">
          <ProfileMetric label="게시글" value={postCount} />
          <ProfileMetric label="받은 좋아요" value={receivedLikeCount} />
          <ProfileMetric label="수상" value={awardCount} />
        </div>
      </section>

      {isOwner ? (
        <section className="grid grid-cols-3 gap-2">
          <Link
            href="/activity"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
          >
            활동 관리
          </Link>
          <Link
            href="/profile/posts"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
          >
            내가 쓴 글
          </Link>
          <Link
            href="/profile/bookmarks"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
          >
            저장한 글
          </Link>
        </section>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-100">
            <Grid3X3 className="h-4 w-4" />
            게시물
          </div>
          <span className="text-[11px] text-slate-500">{posts.length}개 표시</span>
        </div>

        {posts.length > 0 ? (
          <div className="space-y-2">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/posts/${post.id}`}
                className="imf-panel block px-3 py-2.5 transition-colors hover:border-white/30"
              >
                <div className="flex items-center gap-2 text-[11px] text-slate-500">
                  <span>{categoryMap[post.category] || post.category}</span>
                  <span>•</span>
                  <span>
                    {new Date(post.created_at).toLocaleDateString('ko-KR', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
                <p className="mt-1 line-clamp-1 text-sm font-medium text-slate-100">{post.title}</p>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="border-white/10 bg-black/30 p-6 text-center text-sm text-slate-500">
            {displayName}님이 작성한 게시글이 없습니다.
          </Card>
        )}
      </section>
    </div>
  );
}

function ProfileActivitySectionFallback() {
  return (
    <div className="space-y-4 animate-pulse">
      <section className="overflow-hidden rounded-2xl border border-white/10 bg-black/35">
        <div className="grid grid-cols-3 divide-x divide-white/10">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={`profile-metric-skeleton-${index}`} className="py-3 text-center">
              <div className="mx-auto h-5 w-10 rounded bg-slate-800" />
              <div className="mx-auto mt-2 h-3 w-14 rounded bg-slate-900" />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div className="h-4 w-20 rounded bg-slate-800" />
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={`profile-post-skeleton-${index}`} className="rounded-xl border border-white/10 bg-black/30 p-3">
              <div className="h-3 w-24 rounded bg-slate-800" />
              <div className="mt-2 h-4 w-full rounded bg-slate-900" />
              <div className="mt-1 h-4 w-10/12 rounded bg-slate-900" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export async function ProfileScreen({
  profileUserId,
  viewerUserId,
  showOwnerMenu = false,
  backHref = null,
  headerVariant = 'default',
}: ProfileScreenProps) {
  const supabase = await createClient();
  const isOwner = Boolean(viewerUserId && viewerUserId === profileUserId);

  if (isOwner) {
    try {
      await ensureProfileRow(supabase, profileUserId);
    } catch (error) {
      console.error('Error ensuring profile row:', error);
    }
  }

  const profileResult = await supabase
    .from('profiles')
    .select('username, weapon_type, tier, avatar_url, user_type, club_id')
    .eq('id', profileUserId)
    .maybeSingle();

  if (profileResult.error) {
    console.error('Error fetching profile:', profileResult.error);
  }

  let profile = profileResult.data as ProfileRow | null;

  if (!profile && profileResult.error) {
    const { data: fallbackProfile, error: fallbackError } = await supabase
      .from('profiles')
      .select('username, weapon_type, tier, avatar_url, club_id')
      .eq('id', profileUserId)
      .maybeSingle();

    if (fallbackError) {
      console.error('Error fetching profile (fallback):', fallbackError);
    } else if (fallbackProfile) {
      profile = {
        username: fallbackProfile.username,
        weapon_type: fallbackProfile.weapon_type,
        tier: fallbackProfile.tier,
        avatar_url: fallbackProfile.avatar_url,
        user_type: null,
        club_id: fallbackProfile.club_id,
      };
    }
  }

  if (!profile && isOwner) {
    profile = {
      username: null,
      weapon_type: null,
      tier: null,
      avatar_url: null,
      user_type: null,
      club_id: null,
    };
  }

  if (!profile) {
    notFound();
  }

  const displayName = profile.username || 'Fencer';
  const tierLabel = profile.tier || 'Bronze';
  const weaponLabel = profile.weapon_type ? weaponMap[profile.weapon_type] || profile.weapon_type : null;
  const avatarSrc = toSafeAvatarSrc(profile.avatar_url);
  const profileHandle = profile.username
    ? profile.username.replace(/\s+/g, '').toLowerCase()
    : `fencer-${profileUserId.slice(0, 6)}`;

  let clubName: string | null = null;
  if (profile.club_id) {
    const { data: clubData, error: clubError } = await supabase
      .from('fencing_clubs')
      .select('name')
      .eq('id', profile.club_id)
      .maybeSingle();

    if (clubError && clubError.code !== '22P02') {
      console.error('Error fetching profile club:', clubError);
    } else {
      clubName = clubData?.name || null;
    }
  }

  const bioParts = [weaponLabel, profile.user_type || null, clubName].filter(Boolean);
  const bio = bioParts.length > 0 ? bioParts.join(' • ') : '펜싱 커뮤니티에서 활동 중입니다.';

  return (
    <div className="imf-page">
      {headerVariant === 'app' ? (
        <header className="imf-topbar">
          <div className="imf-logo">
            <Image
              src="/app-logo.png"
              alt="ImFencer"
              width={128}
              height={32}
              className="object-contain w-full h-full object-left"
              priority
            />
          </div>
          <div className="flex items-center gap-2">
            {isOwner && showOwnerMenu ? <ProfileMenuButton userId={profileUserId} username={displayName} /> : null}
          </div>
        </header>
      ) : (
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-black/85 px-4 backdrop-blur-xl">
          <div className="flex items-center min-w-0 gap-2">
            {backHref ? (
              <Link href={backHref} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </Link>
            ) : (
              <div className="w-6" />
            )}
            <h1 className="truncate text-base font-semibold text-white">{displayName}</h1>
          </div>
          <Badge variant="outline" className="border-white/20 bg-white/5 text-slate-200">
            {tierLabel}
          </Badge>
        </header>
      )}

      <main className="px-4 py-4 space-y-5">
        <section className="space-y-4 border-b border-white/10 pb-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-24 w-24 shrink-0 border-2 border-white/20 bg-black/50">
              <AvatarImage src={avatarSrc ?? undefined} />
              <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-semibold text-white">{displayName}</h2>
                {weaponLabel ? (
                  <Badge className="border-white/10 bg-white/10 text-slate-200">{weaponLabel}</Badge>
                ) : null}
              </div>
              <p className="text-xs text-slate-500">@{profileHandle}</p>
              <p className="text-sm text-slate-300">{bio}</p>
            </div>
          </div>

          {isOwner ? (
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/market"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
              >
                아이템 마켓
              </Link>
              <Link
                href="/activity"
                className="inline-flex h-10 items-center justify-center rounded-lg border border-white/12 bg-white/[0.03] text-sm font-medium text-slate-200 hover:bg-white/[0.08]"
              >
                신청/예약 관리
              </Link>
            </div>
          ) : (
            <StartChatButton
              targetUserId={profileUserId}
              contextTitle="프로필 문의"
              openingMessage={`${displayName}님께 문의드립니다.`}
              loginNext={`/users/${profileUserId}`}
              label="메시지 보내기"
              size="default"
              variant="outline"
              className="h-10 w-full border-white/20 bg-white/[0.03] text-slate-100 hover:bg-white/[0.08]"
            />
          )}
        </section>

        <Suspense fallback={<ProfileActivitySectionFallback />}>
          <ProfileActivitySection
            profileUserId={profileUserId}
            displayName={displayName}
            isOwner={isOwner}
          />
        </Suspense>

      </main>
    </div>
  );
}
