import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, { params }: RouteContext) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let insertResult = await supabase.from('post_likes').insert({
      post_id: postId,
      user_id: user.id,
    });

    if (insertResult.error?.code === '23503') {
      await ensureProfileRow(supabase, user.id);
      insertResult = await supabase.from('post_likes').insert({
        post_id: postId,
        user_id: user.id,
      });
    }

    if (insertResult.error) {
      // Duplicate like is fine (idempotent).
      if (insertResult.error.code !== '23505') {
        console.error('Error liking post:', insertResult.error);
        return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true, liked: true });
  } catch (error) {
    console.error('POST /api/posts/[id]/likes failed:', error);
    return NextResponse.json({ error: 'Failed to like post' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { error } = await supabase
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error unliking post:', error);
      return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, liked: false });
  } catch (error) {
    console.error('DELETE /api/posts/[id]/likes failed:', error);
    return NextResponse.json({ error: 'Failed to unlike post' }, { status: 500 });
  }
}
