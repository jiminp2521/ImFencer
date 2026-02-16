import 'server-only';
import { cert, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { createAdminClient } from '@/lib/supabase-admin';

type PushProvider = 'fcm' | 'apns' | 'webpush';
type PushPlatform = 'ios' | 'android' | 'web';

type PushDeviceRow = {
  provider: PushProvider;
  platform: PushPlatform;
  device_token: string;
};

type SendPushOptions = {
  dedupeKey?: string;
  notificationId?: string;
  type?: string;
  extraData?: Record<string, string>;
};

type SendPushResult = {
  ok: boolean;
  skipped: boolean;
  sentCount: number;
  failedCount: number;
  reason?: string;
};

const UNREGISTERED_ERROR_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
]);

let firebaseInitialized = false;

const normalizePath = (value: string | null | undefined) => {
  if (!value) return '/';
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const getFirebaseServiceAccount = (): ServiceAccount | null => {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      return JSON.parse(json) as ServiceAccount;
    } catch (error) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:', error);
      return null;
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
};

const ensureFirebase = () => {
  if (firebaseInitialized) return true;

  const serviceAccount = getFirebaseServiceAccount();
  if (!serviceAccount) {
    return false;
  }

  if (getApps().length === 0) {
    initializeApp({
      credential: cert(serviceAccount),
    });
  }

  firebaseInitialized = true;
  return true;
};

const buildWebLink = (path: string) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) return undefined;

  try {
    const base = new URL(appUrl);
    return new URL(path, base).toString();
  } catch {
    return undefined;
  }
};

async function writePushLog(input: {
  userId: string;
  provider: PushProvider;
  platform: PushPlatform;
  deviceToken: string;
  title: string;
  body: string;
  path: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  dedupeKey?: string;
  errorMessage?: string;
  payload?: Record<string, unknown>;
}) {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.from('push_logs').insert({
      user_id: input.userId,
      provider: input.provider,
      platform: input.platform,
      device_token: input.deviceToken,
      title: input.title,
      body: input.body,
      path: input.path,
      dedupe_key: input.dedupeKey || null,
      status: input.status,
      error_message: input.errorMessage || null,
      payload: input.payload || {},
      sent_at: input.status === 'sent' ? new Date().toISOString() : null,
    });

    if (error && error.code !== '23505') {
      console.error('Failed to insert push log:', error);
    }
  } catch (error) {
    console.error('Failed to write push log:', error);
  }
}

export async function sendPush(
  userId: string,
  title: string,
  body: string,
  path: string,
  options: SendPushOptions = {}
): Promise<SendPushResult> {
  const normalizedPath = normalizePath(path);

  if (!userId || !title.trim()) {
    return {
      ok: false,
      skipped: true,
      sentCount: 0,
      failedCount: 0,
      reason: 'invalid-arguments',
    };
  }

  let supabaseAdmin;
  try {
    supabaseAdmin = createAdminClient();
  } catch (error) {
    console.error('Failed to init admin client in push sender:', error);
    return {
      ok: false,
      skipped: false,
      sentCount: 0,
      failedCount: 0,
      reason: 'admin-client-not-configured',
    };
  }

  if (options.dedupeKey) {
    const { data: existingLog, error: dedupeError } = await supabaseAdmin
      .from('push_logs')
      .select('id, status')
      .eq('dedupe_key', options.dedupeKey)
      .maybeSingle();

    if (dedupeError) {
      console.error('Failed to check push dedupe key:', dedupeError);
    }

    if (existingLog) {
      return {
        ok: true,
        skipped: true,
        sentCount: 0,
        failedCount: 0,
        reason: 'duplicate',
      };
    }
  }

  const { data: devices, error: deviceError } = await supabaseAdmin
    .from('push_devices')
    .select('provider, platform, device_token')
    .eq('user_id', userId)
    .eq('is_active', true);

  if (deviceError) {
    console.error('Failed to fetch push devices:', deviceError);
    await writePushLog({
      userId,
      provider: 'webpush',
      platform: 'web',
      deviceToken: 'none',
      title,
      body,
      path: normalizedPath,
      status: 'failed',
      dedupeKey: options.dedupeKey,
      errorMessage: deviceError.message,
    });

    return {
      ok: false,
      skipped: false,
      sentCount: 0,
      failedCount: 1,
      reason: 'device-query-failed',
    };
  }

  const typedDevices = (devices || []) as PushDeviceRow[];
  const fcmTokens = typedDevices
    .filter((device) => device.provider === 'fcm')
    .map((device) => device.device_token)
    .filter(Boolean);

  if (fcmTokens.length === 0) {
    await writePushLog({
      userId,
      provider: typedDevices[0]?.provider || 'webpush',
      platform: typedDevices[0]?.platform || 'web',
      deviceToken: typedDevices[0]?.device_token || 'none',
      title,
      body,
      path: normalizedPath,
      status: 'skipped',
      dedupeKey: options.dedupeKey,
      errorMessage: 'No active FCM tokens',
    });

    return {
      ok: true,
      skipped: true,
      sentCount: 0,
      failedCount: 0,
      reason: 'no-active-fcm-token',
    };
  }

  if (!ensureFirebase()) {
    await writePushLog({
      userId,
      provider: 'fcm',
      platform: typedDevices[0]?.platform || 'web',
      deviceToken: fcmTokens[0],
      title,
      body,
      path: normalizedPath,
      status: 'failed',
      dedupeKey: options.dedupeKey,
      errorMessage: 'Firebase credentials are not configured',
    });

    return {
      ok: false,
      skipped: false,
      sentCount: 0,
      failedCount: fcmTokens.length,
      reason: 'firebase-not-configured',
    };
  }

  const dataPayload: Record<string, string> = {
    path: normalizedPath,
  };

  if (options.notificationId) {
    dataPayload.notificationId = options.notificationId;
  }
  if (options.type) {
    dataPayload.type = options.type;
  }
  if (options.extraData) {
    for (const [key, value] of Object.entries(options.extraData)) {
      if (typeof value === 'string' && value.length > 0) {
        dataPayload[key] = value;
      }
    }
  }

  const response = await getMessaging().sendEachForMulticast({
    tokens: fcmTokens,
    notification: {
      title,
      body,
    },
    data: dataPayload,
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
        },
      },
    },
    webpush: {
      fcmOptions: {
        link: buildWebLink(normalizedPath),
      },
    },
  });

  const invalidTokens: string[] = [];
  const failedCodes: string[] = [];

  response.responses.forEach((result, index) => {
    if (result.success) return;
    const code = result.error?.code || 'unknown-error';
    failedCodes.push(code);
    if (UNREGISTERED_ERROR_CODES.has(code)) {
      invalidTokens.push(fcmTokens[index]);
    }
  });

  if (invalidTokens.length > 0) {
    const { error: disableError } = await supabaseAdmin
      .from('push_devices')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .in('device_token', invalidTokens);

    if (disableError) {
      console.error('Failed to disable invalid push tokens:', disableError);
    }
  }

  const status = response.failureCount > 0 && response.successCount === 0 ? 'failed' : 'sent';
  await writePushLog({
    userId,
    provider: 'fcm',
    platform: typedDevices[0]?.platform || 'web',
    deviceToken: fcmTokens[0],
    title,
    body,
    path: normalizedPath,
    status,
    dedupeKey: options.dedupeKey,
    errorMessage: failedCodes.length > 0 ? failedCodes.join(', ') : undefined,
    payload: {
      tokenCount: fcmTokens.length,
      successCount: response.successCount,
      failureCount: response.failureCount,
      failedCodes,
      invalidTokenCount: invalidTokens.length,
    },
  });

  return {
    ok: response.failureCount === 0,
    skipped: false,
    sentCount: response.successCount,
    failedCount: response.failureCount,
    reason: response.failureCount > 0 ? 'partial-failure' : undefined,
  };
}
