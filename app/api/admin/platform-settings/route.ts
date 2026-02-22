import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { clampFeeRate, getDefaultPlatformSettings } from '@/lib/platform-settings';

type UpdateBody = {
  classFeeRate?: number;
  lessonFeeRate?: number;
  marketFeeRate?: number;
};

const isAdminRole = (value: string | null | undefined) =>
  value === 'admin' || value === 'master' || value === 'operator';

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { supabase, user: null, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Failed to load profile for admin check:', profileError);
    return {
      supabase,
      user,
      response: NextResponse.json({ error: 'Failed to verify permissions' }, { status: 500 }),
    };
  }

  if (!isAdminRole(profile?.user_type || null)) {
    return { supabase, user, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
  }

  return { supabase, user, response: undefined as NextResponse | undefined };
}

export async function GET() {
  const { supabase, response } = await requireAdmin();
  if (response) return response;

  const { data, error } = await supabase
    .from('platform_settings')
    .select('code, class_fee_rate, lesson_fee_rate, market_fee_rate, updated_at')
    .eq('code', 'default')
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Failed to read platform settings:', error);
    return NextResponse.json({ error: 'Failed to read platform settings' }, { status: 500 });
  }

  const fallback = getDefaultPlatformSettings();
  const payload = data || {
    code: 'default',
    class_fee_rate: fallback.classFeeRate,
    lesson_fee_rate: fallback.lessonFeeRate,
    market_fee_rate: fallback.marketFeeRate,
    updated_at: null,
  };

  return NextResponse.json({
    ok: true,
    settings: {
      code: payload.code,
      classFeeRate: Number(payload.class_fee_rate),
      lessonFeeRate: Number(payload.lesson_fee_rate),
      marketFeeRate: Number(payload.market_fee_rate),
      updatedAt: payload.updated_at,
    },
  });
}

export async function PATCH(request: Request) {
  const { supabase, user, response } = await requireAdmin();
  if (response) return response;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = (await request.json().catch(() => null)) as UpdateBody | null;

  const classFeeRate = clampFeeRate(Number(body?.classFeeRate));
  const lessonFeeRate = clampFeeRate(Number(body?.lessonFeeRate));
  const marketFeeRate = clampFeeRate(Number(body?.marketFeeRate));

  if (![classFeeRate, lessonFeeRate, marketFeeRate].every((rate) => Number.isFinite(rate))) {
    return NextResponse.json({ error: 'Invalid fee rates' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('platform_settings')
    .upsert(
      {
        code: 'default',
        class_fee_rate: classFeeRate,
        lesson_fee_rate: lessonFeeRate,
        market_fee_rate: marketFeeRate,
        is_active: true,
        updated_by: user.id,
        updated_at: nowIso,
      },
      {
        onConflict: 'code',
      }
    )
    .select('code, class_fee_rate, lesson_fee_rate, market_fee_rate, updated_at')
    .single();

  if (error || !data) {
    console.error('Failed to update platform settings:', error);
    return NextResponse.json({ error: 'Failed to update platform settings' }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    settings: {
      code: data.code,
      classFeeRate: Number(data.class_fee_rate),
      lessonFeeRate: Number(data.lesson_fee_rate),
      marketFeeRate: Number(data.market_fee_rate),
      updatedAt: data.updated_at,
    },
  });
}
