import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

type CreateCommentBody = {
  content?: string;
  parentId?: string | null;
};

const parseBody = async (request: Request) => {
  const body = (await request.json().catch(() => null)) as CreateCommentBody | null;
  const content = body?.content?.trim() ?? '';
  const parentId = (body?.parentId ?? null) || null;
  return { content, parentId };
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id: postId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { content, parentId } = await parseBody(request);
  if (!content) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }
  if (content.length > 500) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data: postRow, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, title')
      .eq('id', postId)
      .single();

    if (postError || !postRow) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        parent_id: parentId,
        content,
      })
      .select(
        `
        id,
        author_id,
        content,
        created_at,
        profiles:author_id (username)
      `
      )
      .single();

    if (insertError || !inserted) {
      console.error('Error inserting comment:', insertError);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    const profile = Array.isArray(inserted.profiles) ? inserted.profiles[0] : inserted.profiles;
    const authorName = profile?.username || '알 수 없음';

    if (postRow.author_id && postRow.author_id !== user.id) {
      const notificationTitle = '게시글에 새 댓글이 달렸습니다.';
      const notificationBody = content.length > 80 ? `${content.slice(0, 80)}...` : content;

      const { error: notificationError } = await supabase.from('notifications').insert({
        user_id: postRow.author_id,
        actor_id: user.id,
        type: 'comment',
        title: notificationTitle,
        body: notificationBody,
        link: `/posts/${postId}`,
      });

      if (notificationError) {
        // Notifications are best-effort; the comment should still succeed.
        console.error('Error creating comment notification:', notificationError);
      }
    }

    return NextResponse.json({
      ok: true,
      comment: {
        id: inserted.id,
        authorId: inserted.author_id,
        content: inserted.content,
        createdAt: inserted.created_at,
        author: authorName,
      },
    });
  } catch (error) {
    console.error('POST /api/posts/[id]/comments failed:', error);
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
  }
}
