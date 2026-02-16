import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { ensureProfileRow } from '@/lib/ensure-profile';

type TestAccountKey = 'test-1' | 'test-2' | 'test-3';

type TestLoginBody = {
  accountKey?: string;
};

type TestAccountConfig = {
  email: string;
  password: string;
  username: string;
};

const DEFAULT_PASSWORD = 'testuser1234!';

const normalize = (value: string) => value.trim().toLowerCase();

const resolveAccountConfig = (accountKey: TestAccountKey): TestAccountConfig => {
  if (accountKey === 'test-1') {
    return {
      email: normalize(process.env.TEST_ACCOUNT_1_EMAIL || 'test1@imfencer.com'),
      password: process.env.TEST_ACCOUNT_1_PASSWORD || DEFAULT_PASSWORD,
      username: 'test1',
    };
  }

  if (accountKey === 'test-2') {
    return {
      email: normalize(process.env.TEST_ACCOUNT_2_EMAIL || 'test2@imfencer.com'),
      password: process.env.TEST_ACCOUNT_2_PASSWORD || DEFAULT_PASSWORD,
      username: 'test2',
    };
  }

  return {
    email: normalize(process.env.TEST_ACCOUNT_3_EMAIL || 'test3@imfencer.com'),
    password: process.env.TEST_ACCOUNT_3_PASSWORD || DEFAULT_PASSWORD,
    username: 'test3',
  };
};

const isValidAccountKey = (value: string | undefined): value is TestAccountKey => {
  return value === 'test-1' || value === 'test-2' || value === 'test-3';
};

export async function POST(request: Request) {
  const enabled = process.env.ENABLE_TEST_LOGIN === '1' || process.env.NODE_ENV !== 'production';

  if (!enabled) {
    return NextResponse.json({ error: 'TEST_LOGIN_DISABLED' }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as TestLoginBody | null;
  const accountKey = body?.accountKey;

  if (!isValidAccountKey(accountKey)) {
    return NextResponse.json({ error: 'Invalid accountKey' }, { status: 400 });
  }

  const account = resolveAccountConfig(accountKey);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (error) {
    return NextResponse.json(
      {
        error: error.message || 'Failed to sign in test account',
        accountEmail: account.email,
      },
      { status: 401 }
    );
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  let profileUpdated = false;
  let profileWarning: string | null = null;

  try {
    await ensureProfileRow(supabase, data.user.id);

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: data.user.id,
          username: account.username,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'id',
        }
      );

    if (profileError) {
      profileWarning = profileError.message || 'Failed to set test profile nickname';
    } else {
      profileUpdated = true;
    }
  } catch (profileError) {
    const message = profileError instanceof Error ? profileError.message : 'Failed to update test profile';
    profileWarning = message;
  }

  return NextResponse.json({
    ok: true,
    accountEmail: account.email,
    username: account.username,
    profileUpdated,
    profileWarning,
  });
}
