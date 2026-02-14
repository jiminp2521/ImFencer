import { createClient } from '@/lib/supabase-server';
import { FeedItem } from '@/components/community/FeedItem';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import Link from 'next/link';

export const revalidate = 0; // Disable static caching for real-time feel

type HomePageProps = {
  searchParams: Promise<{
    category?: string;
  }>;
};

const categoryFilters = [
  { label: '전체', value: 'All' },
  { label: '자유', value: 'Free' },
  { label: '질문', value: 'Question' },
  { label: '정보', value: 'Info' },
];

export default async function Home({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const supabase = await createClient();
  const selectedCategory = categoryFilters.some(
    (filter) => filter.value === resolvedSearchParams.category
  )
    ? resolvedSearchParams.category!
    : 'All';

  // Fetch posts with author info
  let postsQuery = supabase
    .from('posts')
    .select(`
      *,
      profiles:author_id (username)
    `)
    .order('created_at', { ascending: false });

  if (selectedCategory !== 'All') {
    postsQuery = postsQuery.eq('category', selectedCategory);
  }

  const { data: posts, error } = await postsQuery;

  if (error) {
    console.error("Error fetching posts:", error);
  }

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between h-14">
        <div className="relative w-32 h-8">
          <img src="/app-logo.png" alt="ImFencer" className="object-contain w-full h-full object-left" />
        </div>
        <div className="flex gap-2">
          {/* Notification icon placeholder */}
        </div>
      </header>

      <div className="flex gap-2 px-4 py-3 overflow-x-auto no-scrollbar border-b border-white/5">
        {categoryFilters.map((filter) => (
          <Link
            key={filter.value}
            href={filter.value === 'All' ? '/' : `/?category=${filter.value}`}
            className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
              selectedCategory === filter.value
                ? 'bg-white text-black'
                : 'bg-gray-900 text-gray-400 border border-gray-800'
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      <main>
        {posts && posts.length > 0 ? (
          posts.map((post) => {
            const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles;

            return (
              <FeedItem
                key={post.id}
                id={post.id}
                category={post.category}
                title={post.title}
                previewText={post.content || ''} // Using content as preview for now
                imageUrl={post.image_url}
                tags={post.tags}
                author={profile?.username || '알 수 없음'}
                date={post.created_at}
              />
            );
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500 gap-2">
            <p>등록된 게시글이 없습니다.</p>
            <p className="text-xs text-gray-600">첫 번째 글을 작성해보세요!</p>
          </div>
        )}
      </main>

      <FloatingActionButton />
    </div>
  );
}
