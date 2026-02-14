import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type CreateLessonBody = {
  title?: string;
  description?: string;
  price?: number;
  lesson_mode?: 'offline' | 'online' | 'hybrid';
  location_text?: string | null;
  weapon_type?: string | null;
  duration_minutes?: number;
  max_students?: number;
};

const allowedLessonModes = new Set(['offline', 'online', 'hybrid']);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateLessonBody | null;
  const title = body?.title?.trim() ?? '';
  const description = body?.description?.trim() ?? '';
  const price = Number(body?.price);
  const lessonMode = body?.lesson_mode ?? 'offline';
  const locationText = typeof body?.location_text === 'string' ? body.location_text.trim() : '';
  const weaponType = typeof body?.weapon_type === 'string' ? body.weapon_type : null;
  const durationMinutes = Number(body?.duration_minutes);
  const maxStudents = Number(body?.max_students);

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }
  if (title.length > 80) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 });
  }
  if (!Number.isFinite(price) || price < 0) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
  }
  if (!allowedLessonModes.has(lessonMode)) {
    return NextResponse.json({ error: 'Invalid lesson mode' }, { status: 400 });
  }
  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    return NextResponse.json({ error: 'Invalid duration' }, { status: 400 });
  }
  if (!Number.isFinite(maxStudents) || maxStudents <= 0) {
    return NextResponse.json({ error: 'Invalid max students' }, { status: 400 });
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { error } = await supabase.from('fencing_lesson_products').insert({
      coach_id: user.id,
      title,
      description: description || null,
      price: Math.round(price),
      lesson_mode: lessonMode,
      location_text: locationText || null,
      weapon_type: weaponType || null,
      duration_minutes: Math.round(durationMinutes),
      max_students: Math.round(maxStudents),
      is_active: true,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Error creating lesson product:', error);
      return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('POST /api/fencing/lessons failed:', error);
    return NextResponse.json({ error: 'Failed to create lesson' }, { status: 500 });
  }
}

