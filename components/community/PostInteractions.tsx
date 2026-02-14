'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Heart, Loader2, MessageCircle, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { StartChatButton } from '@/components/chat/StartChatButton';

type PostComment = {
  id: string;
  authorId: string;
  content: string;
  createdAt: string;
  author: string;
};

type PostInteractionsProps = {
  postId: string;
  postTitle: string;
  postAuthorId: string;
  currentUserId: string | null;
  initialLiked: boolean;
  initialBookmarked: boolean;
  initialLikeCount: number;
  initialComments: PostComment[];
};

export function PostInteractions({
  postId,
  postTitle,
  postAuthorId,
  currentUserId,
  initialLiked,
  initialBookmarked,
  initialLikeCount,
  initialComments,
}: PostInteractionsProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [commentInput, setCommentInput] = useState('');
  const [likePending, setLikePending] = useState(false);
  const [bookmarkPending, setBookmarkPending] = useState(false);
  const [commentPending, setCommentPending] = useState(false);

  const moveToLoginIfNeeded = () => {
    if (!currentUserId) {
      alert('로그인이 필요합니다.');
      router.push(`/login?next=/posts/${postId}`);
      return true;
    }

    return false;
  };

  const toggleLike = async () => {
    if (moveToLoginIfNeeded() || !currentUserId || likePending) return;
    setLikePending(true);

    try {
      if (liked) {
        const { error } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        setLiked(false);
        setLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        const { error } = await supabase
          .from('post_likes')
          .insert({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
        setLiked(true);
        setLikeCount((prev) => prev + 1);
      }
    } catch (error) {
      console.error('Like toggle failed:', error);
      alert('좋아요 처리에 실패했습니다.');
    } finally {
      setLikePending(false);
    }
  };

  const toggleBookmark = async () => {
    if (moveToLoginIfNeeded() || !currentUserId || bookmarkPending) return;
    setBookmarkPending(true);

    try {
      if (bookmarked) {
        const { error } = await supabase
          .from('post_bookmarks')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);
        if (error) throw error;
        setBookmarked(false);
      } else {
        const { error } = await supabase
          .from('post_bookmarks')
          .insert({ post_id: postId, user_id: currentUserId });
        if (error) throw error;
        setBookmarked(true);
      }
    } catch (error) {
      console.error('Bookmark toggle failed:', error);
      alert('북마크 처리에 실패했습니다.');
    } finally {
      setBookmarkPending(false);
    }
  };

  const submitComment = async () => {
    if (moveToLoginIfNeeded() || !currentUserId || commentPending) return;

    const content = commentInput.trim();
    if (!content) return;
    setCommentPending(true);

    try {
      const { data, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          author_id: currentUserId,
          content,
        })
        .select(`
          id,
          author_id,
          content,
          created_at,
          profiles:author_id (username)
        `)
        .single();

      if (error) throw error;

      const profile = Array.isArray(data.profiles) ? data.profiles[0] : data.profiles;
      setComments((prev) => [
        ...prev,
        {
          id: data.id,
          authorId: data.author_id,
          content: data.content,
          createdAt: data.created_at,
          author: profile?.username || '알 수 없음',
        },
      ]);
      setCommentInput('');
    } catch (error) {
      console.error('Comment submit failed:', error);
      alert('댓글 등록에 실패했습니다.');
    } finally {
      setCommentPending(false);
    }
  };

  return (
    <section className="space-y-4 border-t border-white/10 pt-4">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 rounded-full px-3 text-gray-300 hover:text-white',
            liked && 'text-red-400 hover:text-red-300'
          )}
          onClick={toggleLike}
          disabled={likePending}
        >
          {likePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Heart className={cn('w-4 h-4', liked && 'fill-current')} />}
          <span>{likeCount}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn(
            'h-9 rounded-full px-3 text-gray-300 hover:text-white',
            bookmarked && 'text-amber-400 hover:text-amber-300'
          )}
          onClick={toggleBookmark}
          disabled={bookmarkPending}
        >
          {bookmarkPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-current')} />
          )}
          <span>{bookmarked ? '저장됨' : '저장'}</span>
        </Button>

        <div className="ml-auto flex items-center gap-1 text-xs text-gray-500">
          <StartChatButton
            targetUserId={postAuthorId}
            contextTitle={postTitle}
            openingMessage={`${postTitle} 게시글 문의드립니다.`}
            loginNext={`/posts/${postId}`}
            label="작성자 채팅"
            size="xs"
            variant="ghost"
            className="text-gray-400 hover:text-white"
          />
          <MessageCircle className="w-4 h-4" />
          <span>{comments.length}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex gap-2">
          <Textarea
            value={commentInput}
            onChange={(event) => setCommentInput(event.target.value)}
            placeholder="댓글을 입력하세요"
            className="min-h-[72px] border-gray-800 bg-gray-950 text-gray-100 placeholder:text-gray-500"
            maxLength={500}
          />
          <Button
            type="button"
            onClick={submitComment}
            disabled={commentPending || !commentInput.trim()}
            className="h-[72px] w-[52px] rounded-lg bg-blue-600 hover:bg-blue-700"
          >
            {commentPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-[11px] text-gray-600">최대 500자</p>
      </div>

      <div className="space-y-3">
        {comments.length > 0 ? (
          comments.map((comment) => (
            <article key={comment.id} className="rounded-lg border border-white/10 bg-gray-950 px-3 py-2.5">
              <div className="mb-1 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-[11px] text-gray-500">
                  <span className="font-medium text-gray-300">{comment.author}</span>
                  <span>•</span>
                  <span>
                    {new Date(comment.createdAt).toLocaleString('ko-KR', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                </div>
                <StartChatButton
                  targetUserId={comment.authorId}
                  contextTitle={postTitle}
                  openingMessage={`${postTitle} 댓글 관련 문의드립니다.`}
                  loginNext={`/posts/${postId}`}
                  label="채팅"
                  size="xs"
                  variant="ghost"
                  className="h-6 px-2 text-[11px] text-gray-400 hover:text-white"
                />
              </div>
              <p className="whitespace-pre-wrap text-sm leading-6 text-gray-200">{comment.content}</p>
            </article>
          ))
        ) : (
          <p className="py-6 text-center text-sm text-gray-500">첫 댓글을 남겨보세요.</p>
        )}
      </div>
    </section>
  );
}
