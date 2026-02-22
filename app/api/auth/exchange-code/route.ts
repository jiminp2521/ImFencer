import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';

type ExchangeBody = {
  code?: string;
  next?: string;
  authMode?: 'login' | 'signup';
};

const sanitizeNextPath = (value: string | null | undefined) => {
  if (!value) return '/';
  if (!value.startsWith('/')) return '/';
  if (value.startsWith('//')) return '/';
  return value;
};

const sanitizeAuthMode = (value: unknown): 'login' | 'signup' => {
  return value === 'signup' ? 'signup' : 'login';
};

const toLoginErrorPath = (message: string) => `/login?oauthError=${encodeURIComponent(message)}`;

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ExchangeBody | null;
  const code = body?.code?.trim() || '';
  const next = sanitizeNextPath(body?.next);
  const authMode = sanitizeAuthMode(body?.authMode);

  if (!code) {
    return NextResponse.json({ error: 'Missing code' }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error('Failed to exchange oauth code:', error);
    return NextResponse.json({ error: 'Failed to exchange auth code' }, { status: 400 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectPath = next;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, is_deleted')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.is_deleted) {
      await supabase.auth.signOut();
      return NextResponse.json({ ok: true, redirectPath: '/login?deleted=1' });
    }

    if (authMode === 'login') {
      if (!profile?.username) {
        await supabase.auth.signOut();
        return NextResponse.json({
          ok: true,
          redirectPath: toLoginErrorPath('가입된 계정이 없습니다. 회원가입을 먼저 진행해주세요.'),
        });
      }
    } else if (profile?.username) {
      await supabase.auth.signOut();
      return NextResponse.json({
        ok: true,
        redirectPath: toLoginErrorPath('이미 가입된 소셜 계정입니다. 로그인 화면에서 로그인해주세요.'),
      });
    } else {
      redirectPath = '/signup/profile';
    }
  }

  return NextResponse.json({
    ok: true,
    redirectPath,
  });
}
