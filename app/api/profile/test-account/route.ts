import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type TestAccountKey = 'test-1' | 'test-2' | 'test-3';

type TestAccountBody = {
  accountKey?: string;
};

type TestAccountProfileConfig = {
  email: string;
  username: string;
};

const normalize = (value: string) => value.trim().toLowerCase();

const resolveAccountConfig = (accountKey: TestAccountKey): TestAccountProfileConfig => {
  if (accountKey === 'test-1') {
    return {
      email: normalize(process.env.TEST_ACCOUNT_1_EMAIL || 'test1@imfencer.com'),
      username: 'test1',
    };
  }

  if (accountKey === 'test-2') {
    return {
      email: normalize(process.env.TEST_ACCOUNT_2_EMAIL || 'test2@imfencer.com'),
      username: 'test2',
    };
  }

  return {
    email: normalize(process.env.TEST_ACCOUNT_3_EMAIL || 'test3@imfencer.com'),
    username: 'test3',
  };
};

const isValidAccountKey = (value: string | undefined): value is TestAccountKey => {
  return value === 'test-1' || value === 'test-2' || value === 'test-3';
};

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TestAccountBody | null;
  const accountKey = body?.accountKey;

  if (!isValidAccountKey(accountKey)) {
    return NextResponse.json({ error: 'Invalid accountKey' }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = resolveAccountConfig(accountKey);
  const userEmail = normalize(user.email || '');

  if (userEmail && userEmail !== account.email) {
    return NextResponse.json(
      {
        error: 'ACCOUNT_EMAIL_MISMATCH',
        expectedEmail: account.email,
        currentEmail: userEmail,
      },
      { status: 403 }
    );
  }

  try {
    await ensureProfileRow(supabase, user.id);

    const { error } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          username: account.username,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          {
            error: 'USERNAME_CONFLICT',
            message: '닉네임이 이미 사용 중입니다.',
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: error.message || 'Failed to update test profile',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, username: account.username });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update test profile';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
