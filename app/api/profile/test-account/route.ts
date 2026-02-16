import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { ensureProfileRow } from '@/lib/ensure-profile';

type TestAccountKey = 'test-1' | 'test-2' | 'test-3';

type TestAccountBody = {
  accountKey?: string;
};

type TestAccountProfileConfig = {
  username: string;
};

const resolveAccountConfig = (accountKey: TestAccountKey): TestAccountProfileConfig => {
  if (accountKey === 'test-1') {
    return {
      username: 'test1',
    };
  }

  if (accountKey === 'test-2') {
    return {
      username: 'test2',
    };
  }

  return {
    username: 'test3',
  };
};

const isValidAccountKey = (value: string | undefined): value is TestAccountKey => {
  return value === 'test-1' || value === 'test-2' || value === 'test-3';
};

const createAdminClient = (): SupabaseClient | null => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
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

  return { ok: true };
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

  const adminClient = createAdminClient();
  const account = resolveAccountConfig(accountKey);

  const result = await upsertTestProfile({
    userClient: supabase,
    adminClient,
    userId: user.id,
    username: account.username,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: 'TEST_PROFILE_SYNC_FAILED',
        message: result.reason,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({ ok: true, username: account.username, userId: user.id });
}
