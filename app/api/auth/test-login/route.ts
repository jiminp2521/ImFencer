import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { ensureProfileRow } from '@/lib/ensure-profile';
import { getSupabaseKeySource, getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase-env';

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
const TEST_LOGIN_API_VERSION = '2026-02-17-test-login-v2';

const normalize = (value: string) => value.trim().toLowerCase();
const maskPrefix = (value: string | undefined, length = 18) => {
  if (!value) return '(missing)';
  return value.slice(0, length);
};
const getProjectRef = (url: string | undefined) => {
  if (!url) return '(missing)';
  const match = url.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co/i);
  return match?.[1] || '(invalid-url)';
};

const isPublishableKey = (value: string) => value.startsWith('sb_publishable_');

const resolveAccounts = (): Record<TestAccountKey, TestAccountConfig> => ({
  'test-1': {
    email: normalize(process.env.TEST_ACCOUNT_1_EMAIL || 'test1@imfencer.com'),
    password: process.env.TEST_ACCOUNT_1_PASSWORD || DEFAULT_PASSWORD,
    username: 'test1',
  },
  'test-2': {
    email: normalize(process.env.TEST_ACCOUNT_2_EMAIL || 'test2@imfencer.com'),
    password: process.env.TEST_ACCOUNT_2_PASSWORD || DEFAULT_PASSWORD,
    username: 'test2',
  },
  'test-3': {
    email: normalize(process.env.TEST_ACCOUNT_3_EMAIL || 'test3@imfencer.com'),
    password: process.env.TEST_ACCOUNT_3_PASSWORD || DEFAULT_PASSWORD,
    username: 'test3',
  },
});

const isValidAccountKey = (value: string | undefined): value is TestAccountKey => {
  return value === 'test-1' || value === 'test-2' || value === 'test-3';
};

const createAdminClient = (): SupabaseClient | null => {
  const url = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

const upsertTestProfile = async ({
  userClient,
  adminClient,
  userId,
  username,
}: {
  userClient: SupabaseClient;
  adminClient: SupabaseClient | null;
  userId: string;
  username: string;
}) => {
  const nowIso = new Date().toISOString();

  if (adminClient) {
    const { error } = await adminClient.from('profiles').upsert(
      {
        id: userId,
        username,
        updated_at: nowIso,
      },
      {
        onConflict: 'id',
      }
    );

    if (error) {
      return {
        ok: false,
        reason: error.message || 'Failed to update test profile via admin client',
      };
    }

    const { data: profileData, error: profileReadError } = await adminClient
      .from('profiles')
      .select('username')
      .eq('id', userId)
      .maybeSingle();

    if (profileReadError) {
      return {
        ok: false,
        reason: profileReadError.message || 'Failed to verify test profile',
      };
    }

    if ((profileData?.username || null) !== username) {
      return {
        ok: false,
        reason: `Profile nickname mismatch (expected ${username}, got ${profileData?.username || 'null'})`,
      };
    }

    return { ok: true };
  }

  try {
    await ensureProfileRow(userClient, userId);
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : 'Failed to ensure profile row',
    };
  }

  const { error } = await userClient
    .from('profiles')
    .update({
      username,
      updated_at: nowIso,
    })
    .eq('id', userId);

  if (error) {
    return {
      ok: false,
      reason: error.message || 'Failed to update test profile via user session',
    };
  }

  const { data: profileData, error: profileReadError } = await userClient
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .maybeSingle();

  if (profileReadError) {
    return {
      ok: false,
      reason: profileReadError.message || 'Failed to verify test profile',
    };
  }

  if ((profileData?.username || null) !== username) {
    return {
      ok: false,
      reason: `Profile nickname mismatch (expected ${username}, got ${profileData?.username || 'null'})`,
    };
  }

  return { ok: true };
};

export async function POST(request: Request) {
  const rawEnableValue = (process.env.ENABLE_TEST_LOGIN || '').trim().toLowerCase();
  const enabled = rawEnableValue === '0' || rawEnableValue === 'false' ? false : true;

  if (!enabled) {
    return NextResponse.json(
      {
        error: 'TEST_LOGIN_DISABLED',
        message: 'ENABLE_TEST_LOGIN 값이 0/false 로 설정되어 있습니다.',
      },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => null)) as TestLoginBody | null;
  const accountKey = body?.accountKey;

  if (!isValidAccountKey(accountKey)) {
    return NextResponse.json({ error: 'Invalid accountKey' }, { status: 400 });
  }

  const accountMap = resolveAccounts();
  const account = accountMap[accountKey];
  const activeKey = getSupabasePublishableKey();
  const keySource = getSupabaseKeySource();
  const anonKeyPrefix = maskPrefix(activeKey);
  const projectRef = getProjectRef(getSupabaseUrl());

  if (!isPublishableKey(activeKey)) {
    return NextResponse.json(
      {
        error: 'SUPABASE_PUBLISHABLE_KEY_REQUIRED',
        message:
          '프로덕션 서버 키가 sb_publishable_ 형식이 아닙니다. Vercel Production의 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인하세요.',
        activeAnonKeyPrefix: anonKeyPrefix,
        activeProjectRef: projectRef,
        activeKeySource: keySource,
        apiVersion: TEST_LOGIN_API_VERSION,
      },
      { status: 500 }
    );
  }

  const configuredEmails = Object.values(accountMap).map((item) => item.email);
  if (new Set(configuredEmails).size !== configuredEmails.length) {
    return NextResponse.json(
      {
        error: 'TEST_ACCOUNT_CONFIG_DUPLICATED_EMAILS',
        message: '테스트 계정 이메일 3개가 서로 달라야 합니다.',
      },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  await supabase.auth.signOut();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: account.email,
    password: account.password,
  });

  if (error) {
    const rawMessage = error.message || 'Failed to sign in test account';
    const isLegacyKeyError = /legacy api keys are disabled/i.test(rawMessage);

    return NextResponse.json(
      {
        error: rawMessage,
        message: isLegacyKeyError
          ? 'Supabase 키가 구형(legacy)입니다. Vercel에서 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY에 sb_publishable_ 키를 넣고, 기존 ANON 키는 제거하세요.'
          : rawMessage,
        errorCode: isLegacyKeyError ? 'SUPABASE_LEGACY_KEY_DISABLED' : 'TEST_LOGIN_FAILED',
        accountEmail: account.email,
        activeAnonKeyPrefix: anonKeyPrefix,
        activeProjectRef: projectRef,
        activeKeySource: keySource,
        apiVersion: TEST_LOGIN_API_VERSION,
      },
      { status: 401 }
    );
  }

  if (!data.user) {
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  const signedInEmail = normalize(data.user.email || '');
  if (!signedInEmail || signedInEmail !== account.email) {
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        error: 'TEST_ACCOUNT_EMAIL_MISMATCH',
        message: '요청한 테스트 계정과 실제 로그인된 계정 이메일이 다릅니다.',
        accountEmail: account.email,
        signedInEmail,
      },
      { status: 409 }
    );
  }

  const profileUpdateResult = await upsertTestProfile({
    userClient: supabase,
    adminClient,
    userId: data.user.id,
    username: account.username,
  });

  if (!profileUpdateResult.ok) {
    await supabase.auth.signOut();

    return NextResponse.json(
      {
        error: 'TEST_PROFILE_SYNC_FAILED',
        message: profileUpdateResult.reason,
        userId: data.user.id,
        accountEmail: account.email,
        username: account.username,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    ok: true,
    userId: data.user.id,
    accountEmail: account.email,
    username: account.username,
    apiVersion: TEST_LOGIN_API_VERSION,
  });
}

export async function GET() {
  const activeKey = getSupabasePublishableKey();
  const keySource = getSupabaseKeySource();

  return NextResponse.json({
    ok: true,
    apiVersion: TEST_LOGIN_API_VERSION,
    enabled: (process.env.ENABLE_TEST_LOGIN || '').trim().toLowerCase() !== '0' &&
      (process.env.ENABLE_TEST_LOGIN || '').trim().toLowerCase() !== 'false',
    keySource,
    keyPrefix: maskPrefix(activeKey),
    isPublishableKey: isPublishableKey(activeKey),
    projectRef: getProjectRef(getSupabaseUrl()),
  });
}
