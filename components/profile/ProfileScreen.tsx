import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
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

const toSafeAvatarSrc = (value: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith('https://') ? trimmed : null;
};

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

  const [profileResult, postsCountResult, likeCountResult, awardsCountResult, postsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, weapon_type, tier, avatar_url, user_type, club_id')
      .eq('id', profileUserId)
      .maybeSingle(),
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

  if (profileResult.error) {
    console.error('Error fetching profile:', profileResult.error);
  }
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
  let clubName: string | null = null;

  if (profile.club_id) {
    const { data: clubData, error: clubError } = await supabase
      .from('fencing_clubs')
      .select('name')
      .eq('id', profile.club_id)
      .maybeSingle();

    // Ignore invalid UUID when legacy text `club_id` data is present.
    if (clubError && clubError.code !== '22P02') {
      console.error('Error fetching profile club:', clubError);
    } else {
      clubName = clubData?.name || null;
    }
  }

  const bioParts = [weaponLabel, profile.user_type || null, clubName].filter(Boolean);
  const bio = bioParts.length > 0 ? bioParts.join(' • ') : '프로필 정보가 없습니다.';

  const postCount = postsCountResult.count || 0;
  const receivedLikeCount = likeCountResult.count || 0;
  const awardCount = awardsCountResult.count || 0;
  const posts = (postsResult.data || []) as PostRow[];
  const avatarSrc = toSafeAvatarSrc(profile.avatar_url);
  const careerScore = postCount * 4 + receivedLikeCount + awardCount * 12;
  const showcaseTitle =
    careerScore >= 160 ? 'National Challenger' : careerScore >= 70 ? 'Club Ace' : careerScore >= 30 ? 'Rising Duelist' : 'Rookie Blade';
  const showcaseSummary = `게시글 ${postCount}개 · 받은 좋아요 ${receivedLikeCount}개 · 수상 ${awardCount}회`;
  const highlightItems = [
    { label: '커뮤니티 영향력', value: `${receivedLikeCount.toLocaleString()} Likes` },
    { label: '콘텐츠 생산량', value: `${postCount.toLocaleString()} Posts` },
    { label: '공식 실적', value: `${awardCount.toLocaleString()} Awards` },
  ];

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
        <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 h-14 flex items-center justify-between">
          <div className="flex items-center min-w-0 gap-2">
            {backHref ? (
              <Link href={backHref} className="text-gray-400 hover:text-white transition-colors">
                <ChevronLeft className="w-6 h-6" />
              </Link>
            ) : (
              <div className="w-6" />
            )}
            <h1 className="text-base font-semibold text-white truncate">{displayName}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-gray-700 bg-transparent text-gray-300">
              {tierLabel} Tier
            </Badge>
            {isOwner && showOwnerMenu ? <ProfileMenuButton userId={profileUserId} username={displayName} /> : null}
          </div>
        </header>
      )}

      <main className="p-4 space-y-4">
        <section className="imf-panel flex items-center gap-4 border-cyan-300/20 bg-[linear-gradient(135deg,rgba(7,11,22,0.94),rgba(7,7,11,0.95))]">
          <Avatar className="h-20 w-20 rounded-2xl border-2 border-cyan-300/30 bg-black/50">
            <AvatarImage src={avatarSrc ?? undefined} />
            <AvatarFallback className="rounded-2xl">{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>

          <div className="flex-1 space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-white truncate">{displayName}</h2>
              {profile.user_type ? (
                <Badge className="border-white/10 bg-gray-900 text-gray-300">{profile.user_type}</Badge>
              ) : null}
              {weaponLabel ? (
                <Badge className="border-white/10 bg-gray-900 text-gray-300">{weaponLabel}</Badge>
              ) : null}
            </div>
            <p className="text-sm text-slate-400">{bio}</p>
            {isOwner ? (
              <div className="flex flex-wrap gap-2 pt-1">
                <Link href="/market" className="imf-pill border-emerald-300/35 bg-emerald-500/10 text-emerald-100">
                  아이템 마켓
                </Link>
              </div>
            ) : null}
            {!isOwner ? (
              <div className="pt-1">
                <StartChatButton
                  targetUserId={profileUserId}
                  contextTitle="프로필 문의"
                  openingMessage={`${displayName}님께 문의드립니다.`}
                  loginNext={`/users/${profileUserId}`}
                  label="채팅하기"
                  size="sm"
                  variant="outline"
                  className="border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800"
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Card className="imf-panel p-3 text-center">
            <div className="text-xl font-bold text-white">{postCount}</div>
            <div className="text-xs text-slate-400">게시글</div>
          </Card>
          <Card className="imf-panel p-3 text-center">
            <div className="text-xl font-bold text-white">{receivedLikeCount}</div>
            <div className="text-xs text-slate-400">받은 좋아요</div>
          </Card>
          <Card className="imf-panel p-3 text-center">
            <div className="text-xl font-bold text-white">{awardCount}</div>
            <div className="text-xs text-slate-400">수상 인증</div>
          </Card>
        </section>

        <section
          id="career-showcase"
          className="imf-panel space-y-3 border-amber-300/20 bg-[linear-gradient(128deg,rgba(43,26,8,0.9),rgba(17,10,4,0.96))]"
        >
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-lg font-semibold text-amber-100">Career Showcase</h3>
            <Badge className="border-amber-300/30 bg-amber-400/15 text-amber-100">{showcaseTitle}</Badge>
          </div>
          <p className="text-xs text-amber-50/85">{showcaseSummary}</p>
          <div className="grid grid-cols-3 gap-2">
            {highlightItems.map((item) => (
              <div key={item.label} className="rounded-xl border border-amber-200/20 bg-black/30 p-2.5 text-center">
                <p className="text-[10px] text-amber-100/70">{item.label}</p>
                <p className="mt-1 text-sm font-semibold text-amber-50">{item.value}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-amber-100/70">
            {isOwner
              ? '프로필 메뉴에서 내 활동과 콘텐츠를 관리할 수 있습니다.'
              : `${displayName}님의 경기/커뮤니티 활동이 쇼케이스로 정리되어 있습니다.`}
          </p>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">게시물</h3>
            <span className="text-xs text-slate-400">{posts.length}개 표시</span>
          </div>
          {posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="imf-panel block px-3 py-2.5 transition-colors hover:border-white/35"
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
                  <p className="mt-1 text-sm font-medium text-slate-100 line-clamp-1">{post.title}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="imf-panel p-4 text-center text-sm text-slate-400">
              아직 작성한 게시글이 없습니다.
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
