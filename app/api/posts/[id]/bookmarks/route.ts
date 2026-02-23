import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { getAuthenticatedUserId } from '@/lib/auth-user';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let insertResult = await supabase.from('post_bookmarks').insert({
      post_id: postId,
      user_id: userId,
    });

    if (insertResult.error?.code === '23503') {
      await ensureProfileRow(supabase, userId);
      insertResult = await supabase.from('post_bookmarks').insert({
        post_id: postId,
        user_id: userId,
      });
    }

    if (insertResult.error) {
      // Duplicate bookmark is fine (idempotent).
      if (insertResult.error.code !== '23505') {
        console.error('Error bookmarking post:', insertResult.error);
        return NextResponse.json({ error: 'Failed to bookmark post' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, bookmarked: true });
  } catch (error) {
    console.error('POST /api/posts/[id]/bookmarks failed:', error);
    return NextResponse.json({ error: 'Failed to bookmark post' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const userId = await getAuthenticatedUserId(supabase);

  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from('post_bookmarks')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing bookmark:', error);
      return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, bookmarked: false });
  } catch (error) {
    console.error('DELETE /api/posts/[id]/bookmarks failed:', error);
    return NextResponse.json({ error: 'Failed to remove bookmark' }, { status: 500 });
  }
}
