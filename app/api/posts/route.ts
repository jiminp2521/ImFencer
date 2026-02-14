import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type CreatePostBody = {
  title?: string;
  content?: string;
  category?: string;
  tags?: string[];
  imageUrl?: string | null;
};

const allowedCategories = new Set(['Free', 'Info', 'Question']);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreatePostBody | null;
  const title = body?.title?.trim() ?? '';
  const content = body?.content?.trim() ?? '';
  const category = body?.category ?? 'Free';
  const tags = Array.isArray(body?.tags) ? body!.tags.filter((tag) => typeof tag === 'string') : [];
  const imageUrl = typeof body?.imageUrl === 'string' ? body?.imageUrl.trim() : null;

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (title.length > 120) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 });
  }
  if (!allowedCategories.has(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
  }
  if (content.length > 8000) {
    return NextResponse.json({ error: 'Content too long' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { data, error } = await supabase
      .from('posts')
      .insert({
        author_id: user.id,
        category,
        title,
        content: content || null,
        image_url: imageUrl || null,
        tags,
      })
      .select('id')
      .single();

    if (error || !data) {
      console.error('Error creating post:', error);
      return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, id: data.id });
  } catch (error) {
    console.error('POST /api/posts failed:', error);
    return NextResponse.json({ error: 'Failed to create post' }, { status: 500 });
  }
}

