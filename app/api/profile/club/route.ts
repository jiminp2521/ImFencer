import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type UpdateClubBody = {
  clubId?: string | null;
};

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as UpdateClubBody | null;
  const clubId = typeof body?.clubId === 'string' ? body.clubId.trim() : '';

  if (!clubId) {
    return NextResponse.json({ error: 'clubId is required' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { error } = await supabase
      .from('profiles')
      .update({
        club_id: clubId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating club id:', error);
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/profile/club failed:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}

