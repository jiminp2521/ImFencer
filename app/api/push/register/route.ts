import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

type PushProvider = 'fcm' | 'apns' | 'webpush';
type PushPlatform = 'ios' | 'android' | 'web';

type RegisterBody = {
  token?: string;
  provider?: PushProvider;
  platform?: PushPlatform;
};

const isProvider = (value: unknown): value is PushProvider =>
  value === 'fcm' || value === 'apns' || value === 'webpush';

const isPlatform = (value: unknown): value is PushPlatform =>
  value === 'ios' || value === 'android' || value === 'web';

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RegisterBody | null;
  const token = body?.token?.trim();
  const provider = body?.provider;
  const platform = body?.platform;

  if (!token || token.length < 16 || !isProvider(provider) || !isPlatform(platform)) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase.from('push_devices').upsert(
    {
      user_id: user.id,
      device_token: token,
      provider,
      platform,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: 'device_token',
    }
  );

  if (error) {
    console.error('Error registering push device:', error);
    return NextResponse.json({ error: 'Failed to register push device' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { token?: string } | null;
  const token = body?.token?.trim();

  if (!token) {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  const { error } = await supabase
    .from('push_devices')
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', user.id)
    .eq('device_token', token);

  if (error) {
    console.error('Error disabling push device:', error);
    return NextResponse.json({ error: 'Failed to disable push device' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
