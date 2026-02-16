import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { StartChatButton } from '@/components/chat/StartChatButton';
import { createClient } from '@/lib/supabase-server';
import { ProfileMenuButton } from '@/components/profile/ProfileMenuButton';

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
  fencing_clubs: { name: string } | { name: string }[] | null;
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
};

export async function ProfileScreen({
  profileUserId,
  viewerUserId,
  showOwnerMenu = false,
  backHref = null,
}: ProfileScreenProps) {
  const supabase = await createClient();
  const isOwner = Boolean(viewerUserId && viewerUserId === profileUserId);

  const [profileResult, postsCountResult, likeCountResult, awardsCountResult, postsResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('username, weapon_type, tier, avatar_url, user_type, club_id, fencing_clubs:club_id (name)')
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

  const profile = profileResult.data as ProfileRow | null;
  if (!profile) {
    notFound();
  }

  const displayName = profile.username || 'Fencer';
  const tierLabel = profile.tier || 'Bronze';
  const weaponLabel = profile.weapon_type ? weaponMap[profile.weapon_type] || profile.weapon_type : null;
  const profileClub = Array.isArray(profile.fencing_clubs) ? profile.fencing_clubs[0] : profile.fencing_clubs;
  const clubName = profileClub?.name || null;

  const bioParts = [weaponLabel, profile.user_type || null, clubName].filter(Boolean);
  const bio = bioParts.length > 0 ? bioParts.join(' • ') : '프로필 정보가 없습니다.';

  const postCount = postsCountResult.count || 0;
  const receivedLikeCount = likeCountResult.count || 0;
  const awardCount = awardsCountResult.count || 0;
  const posts = (postsResult.data || []) as PostRow[];

  return (
    <div className="pb-20">
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

      <main className="p-4 space-y-6">
        <section className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-white/10">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback>{displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
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
            <p className="text-sm text-gray-400">{bio}</p>
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
                  className="border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                />
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid grid-cols-3 gap-3">
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{postCount}</div>
            <div className="text-xs text-gray-500">게시글</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{receivedLikeCount}</div>
            <div className="text-xs text-gray-500">받은 좋아요</div>
          </Card>
          <Card className="bg-gray-900 border-gray-800 p-3 text-center">
            <div className="text-xl font-bold text-white">{awardCount}</div>
            <div className="text-xs text-gray-500">수상 인증</div>
          </Card>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">게시물</h3>
            <span className="text-xs text-gray-500">{posts.length}개 표시</span>
          </div>
          {posts.length > 0 ? (
            <div className="space-y-2">
              {posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/posts/${post.id}`}
                  className="block rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5 hover:bg-gray-900/70 transition-colors"
                >
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span>{categoryMap[post.category] || post.category}</span>
                    <span>•</span>
                    <span>
                      {new Date(post.created_at).toLocaleDateString('ko-KR', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-100 line-clamp-1">{post.title}</p>
                </Link>
              ))}
            </div>
          ) : (
            <Card className="bg-gray-950 border-gray-800 p-4 text-center text-sm text-gray-500">
              아직 작성한 게시글이 없습니다.
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
