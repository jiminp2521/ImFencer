import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { parsePixelAvatarToken } from '@/lib/pixel-avatar';

type UpdateAvatarBody = {
  avatarToken?: string;
};

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (error) {
    console.error('GET /api/profile/avatar failed:', error);
    return NextResponse.json({ error: 'Failed to load avatar' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    avatarToken: profile?.avatar_url || null,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return unauthorized();
  }

  const body = (await request.json().catch(() => null)) as UpdateAvatarBody | null;
  const avatarToken = typeof body?.avatarToken === 'string' ? body.avatarToken.trim() : '';

  if (!avatarToken) {
    return NextResponse.json({ error: 'avatarToken is required' }, { status: 400 });
  }

  if (!parsePixelAvatarToken(avatarToken)) {
    return NextResponse.json({ error: 'Invalid avatar token' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { error } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarToken,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('POST /api/profile/avatar failed:', error);
      return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, avatarToken });
  } catch (error) {
    console.error('POST /api/profile/avatar failed:', error);
    return NextResponse.json({ error: 'Failed to update avatar' }, { status: 500 });
  }
}
